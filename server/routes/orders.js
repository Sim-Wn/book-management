import { Router } from 'express'
import pool from '../db.js'
import { authRequired, isAdmin } from '../middleware/auth.js'

const router = Router()

const TRANSITIONS = {
  '待付款': ['待发货', '已取消'],
  '待发货': ['已发货', '已取消'],
  '已发货': ['已签收'],
  '已签收': ['已完成', '申请退货'],
  '申请退货': ['退货中', '已完成'],
  '退货中': ['已退货'],
}

function httpError(status, msg) {
  return Object.assign(new Error(msg), { status })
}

function makeOrderNo() {
  return String(Date.now()) + String(Math.floor(Math.random() * 900) + 100)
}

// 下单时已扣库存，取消/退货完成要还回去
async function restoreStock(conn, orderId) {
  await conn.query(
    `UPDATE books b JOIN order_items oi ON oi.book_id = b.id
     SET b.stock = b.stock + oi.quantity WHERE oi.order_id = ?`,
    [orderId]
  )
}

// 销量只在订单完成时累加
async function addSales(conn, orderId) {
  await conn.query(
    `UPDATE books b JOIN order_items oi ON oi.book_id = b.id
     SET b.sales = b.sales + oi.quantity WHERE oi.order_id = ?`,
    [orderId]
  )
}

async function applyEffects(conn, orderId, from, to) {
  if (to === '已取消' || to === '已退货') await restoreStock(conn, orderId)
  if (to === '已完成' && from !== '已完成') await addSales(conn, orderId)
}

// 下单：只收 book_id + quantity，价格、总价、卖家全部由服务端计算
router.post('/', authRequired, async (req, res) => {
  const { address, phone, remark, items } = req.body || {}
  if (!address || !phone) return res.json({ ok: false, msg: '请填写收货地址和电话' })
  if (!Array.isArray(items) || !items.length) return res.json({ ok: false, msg: '订单不能为空' })

  const wanted = new Map()
  for (const it of items) {
    const id = Number(it.book_id ?? it.id)
    const quantity = Math.max(1, Number(it.quantity) || 1)
    if (!Number.isInteger(id) || id <= 0) return res.json({ ok: false, msg: '商品参数错误' })
    wanted.set(id, (wanted.get(id) || 0) + quantity)
  }
  const ids = [...wanted.keys()]

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [books] = await conn.query(
      `SELECT id,name,price,stock,status,seller_id FROM books WHERE id IN (${ids.map(() => '?').join(',')}) FOR UPDATE`,
      ids
    )
    if (books.length !== ids.length) throw httpError(400, '部分图书不存在或已下架')

    const sellerIds = new Set(books.map(b => b.seller_id).filter(v => v != null))
    if (sellerIds.size > 1) throw httpError(400, '购物车包含多个卖家的图书，请分开下单')

    let total = 0
    for (const b of books) {
      if (b.status !== '在售') throw httpError(400, `《${b.name}》已下架或已售出`)
      const quantity = wanted.get(b.id)
      if (b.stock < quantity) throw httpError(400, `《${b.name}》库存不足`)
      total += Number(b.price) * quantity
    }
    total = Math.round(total * 100) / 100

    const [[user]] = await conn.query('SELECT username FROM users WHERE id=?', [req.user.id])
    if (!user) throw httpError(401, '账号不存在')

    const orderNo = makeOrderNo()
    const [result] = await conn.query(
      'INSERT INTO orders (order_no,user_id,seller_id,user_name,total,status,address,phone,remark) VALUES (?,?,?,?,?,?,?,?,?)',
      [orderNo, req.user.id, [...sellerIds][0] ?? null, user.username, total, '待付款', address, phone, remark || '']
    )
    const orderId = result.insertId
    for (const b of books) {
      const quantity = wanted.get(b.id)
      await conn.query(
        'INSERT INTO order_items (order_id,book_id,book_name,price,quantity) VALUES (?,?,?,?,?)',
        [orderId, b.id, b.name, b.price, quantity]
      )
      await conn.query('UPDATE books SET stock = stock - ? WHERE id=?', [quantity, b.id])
    }
    await conn.commit()
    res.json({ ok: true, id: orderId, order_no: orderNo, total })
  } catch (e) {
    await conn.rollback()
    if (e.status) return res.status(e.status).json({ ok: false, msg: e.message })
    console.error('POST /orders error:', e.message)
    res.status(500).json({ ok: false, msg: '下单失败，请稍后重试' })
  } finally { conn.release() }
})

router.get('/', authRequired, async (req, res) => {
  try {
    let sql = 'SELECT * FROM orders'
    const params = []
    if (!isAdmin(req)) {
      sql += ' WHERE user_id=?'
      params.push(req.user.id)
    } else if (req.query.user_id) {
      sql += ' WHERE user_id=?'
      params.push(req.query.user_id)
    }
    sql += ' ORDER BY id DESC'
    const [orders] = await pool.query(sql, params)
    if (!orders.length) return res.json([])

    const ids = orders.map(o => o.id)
    const [items] = await pool.query(`SELECT * FROM order_items WHERE order_id IN (${ids.map(() => '?').join(',')})`, ids)
    const byOrder = new Map()
    for (const it of items) {
      if (!byOrder.has(it.order_id)) byOrder.set(it.order_id, [])
      byOrder.get(it.order_id).push(it)
    }
    for (const o of orders) o.items = byOrder.get(o.id) || []
    res.json(orders)
  } catch (e) {
    console.error('GET /orders error:', e.message)
    res.json([])
  }
})

async function loadOrderForUpdate(conn, id) {
  const [[order]] = await conn.query('SELECT * FROM orders WHERE id=? FOR UPDATE', [id])
  return order
}

function canOperate(req, order) {
  return isAdmin(req) || String(order.user_id) === String(req.user.id) || String(order.seller_id) === String(req.user.id)
}

// 统一的改状态入口：校验权限 → 校验状态机 → 落库 → 处理库存/销量
router.put('/:id/status', authRequired, async (req, res) => {
  const { status } = req.body || {}
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const order = await loadOrderForUpdate(conn, req.params.id)
    if (!order) throw httpError(404, '订单不存在')
    if (!canOperate(req, order)) throw httpError(403, '无权操作该订单')

    const allowed = TRANSITIONS[order.status] || []
    if (!allowed.includes(status)) throw httpError(400, `不能从「${order.status}」改为「${status}」`)

    await conn.query('UPDATE orders SET status=? WHERE id=?', [status, order.id])
    await applyEffects(conn, order.id, order.status, status)
    await conn.commit()
    res.json({ ok: true })
  } catch (e) {
    await conn.rollback()
    if (e.status) return res.status(e.status).json({ ok: false, msg: e.message })
    console.error('PUT /orders/:id/status error:', e.message)
    res.status(500).json({ ok: false, msg: '操作失败' })
  } finally { conn.release() }
})

// 以下四个接口内部复用同一个状态流转逻辑（仅买家本人或管理员）
function transitionRoute(from, to, failMsg) {
  return async (req, res) => {
    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()
      const order = await loadOrderForUpdate(conn, req.params.id)
      if (!order) throw httpError(404, '订单不存在')
      const permitted = isAdmin(req) || String(order.user_id) === String(req.user.id)
      if (!permitted) throw httpError(403, '无权操作该订单')
      if (order.status !== from) throw httpError(400, failMsg)
      await conn.query('UPDATE orders SET status=? WHERE id=?', [to, order.id])
      await applyEffects(conn, order.id, order.status, to)
      await conn.commit()
      res.json({ ok: true })
    } catch (e) {
      await conn.rollback()
      if (e.status) return res.status(e.status).json({ ok: false, msg: e.message })
      console.error(`POST /orders/:id${req.path} error:`, e.message)
      res.status(500).json({ ok: false, msg: '操作失败' })
    } finally { conn.release() }
  }
}

router.post('/:id/pay', authRequired, transitionRoute('待付款', '待发货', '只能支付待付款的订单'))
router.post('/:id/cancel', authRequired, async (req, res) => {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const order = await loadOrderForUpdate(conn, req.params.id)
    if (!order) throw httpError(404, '订单不存在')
    if (!isAdmin(req) && String(order.user_id) !== String(req.user.id)) throw httpError(403, '无权操作该订单')
    if (order.status !== '待付款' && order.status !== '待发货') throw httpError(400, '只能取消待付款或待发货的订单')
    await conn.query("UPDATE orders SET status='已取消' WHERE id=?", [order.id])
    await applyEffects(conn, order.id, order.status, '已取消')
    await conn.commit()
    res.json({ ok: true })
  } catch (e) {
    await conn.rollback()
    if (e.status) return res.status(e.status).json({ ok: false, msg: e.message })
    console.error('POST /orders/:id/cancel error:', e.message)
    res.status(500).json({ ok: false, msg: '操作失败' })
  } finally { conn.release() }
})
router.post('/:id/receive', authRequired, transitionRoute('已发货', '已签收', '只能确认已发货的订单'))
router.post('/:id/refund', authRequired, transitionRoute('已签收', '申请退货', '只能对已签收的订单申请退货'))

export default router
