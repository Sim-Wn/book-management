import { Router } from 'express'
import pool from '../db.js'
import { authRequired, adminOnly, isAdmin, isSelf } from '../middleware/auth.js'

const router = Router()

const SWAP_TRANSITIONS = {
  '待确认': ['已同意', '已拒绝'],
  '已同意': ['已完成'],
}

function httpError(status, msg) {
  return Object.assign(new Error(msg), { status })
}

// 完成交换：两本书互换主人并标记「已交换」
// 注意：mysql2 的 query 返回 [rows, fields]，解构时要多一层
async function completeSwap(conn, swap) {
  const [[fromRows], [toRows]] = await Promise.all([
    conn.query('SELECT id,seller_id,seller_name FROM books WHERE id=?', [swap.from_book_id]),
    conn.query('SELECT id,seller_id,seller_name FROM books WHERE id=?', [swap.to_book_id]),
  ])
  const fromBook = fromRows[0]
  const toBook = toRows[0]
  if (!fromBook || !toBook) throw httpError(400, '交换的图书已不存在')
  if (String(fromBook.seller_id) !== String(swap.from_user_id) || String(toBook.seller_id) !== String(swap.to_user_id)) {
    throw httpError(400, '图书归属已变化，无法完成交换')
  }
  await conn.query("UPDATE books SET seller_id=?, seller_name=?, status='已交换', stock=0 WHERE id=?", [
    toBook.seller_id, toBook.seller_name, swap.from_book_id,
  ])
  await conn.query("UPDATE books SET seller_id=?, seller_name=?, status='已交换', stock=0 WHERE id=?", [
    fromBook.seller_id, fromBook.seller_name, swap.to_book_id,
  ])
}

router.post('/', authRequired, async (req, res) => {
  const { from_book_id, from_book_name, to_user_id, to_book_id, to_book_name } = req.body || {}
  try {
    if (!from_book_id || !to_book_id) return res.json({ ok: false, msg: '请选择要交换的图书' })
    if (String(from_book_id) === String(to_book_id)) return res.json({ ok: false, msg: '不能和自己交换同一本书' })

    const [[fromBook]] = await pool.query('SELECT seller_id, status FROM books WHERE id=?', [from_book_id])
    if (!fromBook) return res.json({ ok: false, msg: '发起方的书籍不存在' })
    if (String(fromBook.seller_id) !== String(req.user.id)) return res.json({ ok: false, msg: '只能拿自己上架的书发起交换' })
    if (fromBook.status !== '在售') return res.json({ ok: false, msg: '发起方的书籍已下架或已售出' })

    const [[toBook]] = await pool.query('SELECT seller_id, status FROM books WHERE id=?', [to_book_id])
    if (!toBook) return res.json({ ok: false, msg: '目标书籍不存在' })
    if (toBook.status !== '在售') return res.json({ ok: false, msg: '目标书籍已下架或已售出' })
    if (toBook.seller_id == null) return res.json({ ok: false, msg: '平台自营图书不支持交换' })
    if (String(toBook.seller_id) !== String(to_user_id)) return res.json({ ok: false, msg: '目标书籍卖家信息不正确' })
    if (String(toBook.seller_id) === String(req.user.id)) return res.json({ ok: false, msg: '不能和自己交换图书' })

    const [result] = await pool.query(
      'INSERT INTO swaps (from_user_id, from_book_id, from_book_name, to_user_id, to_book_id, to_book_name, status) VALUES (?,?,?,?,?,?,?)',
      [req.user.id, from_book_id, from_book_name || '', toBook.seller_id, to_book_id, to_book_name || '', '待确认']
    )
    res.json({ ok: true, id: result.insertId })
  } catch (e) {
    console.error('POST /swaps error:', e.message)
    res.status(500).json({ ok: false, msg: '发起失败' })
  }
})

router.get('/', authRequired, async (req, res) => {
  const { user_id } = req.query
  const target = isAdmin(req) && user_id ? user_id : req.user.id
  try {
    const [rows] = await pool.query(
      `SELECT s.*, fu.username AS from_user_name, tu.username AS to_user_name
       FROM swaps s
       LEFT JOIN users fu ON s.from_user_id = fu.id
       LEFT JOIN users tu ON s.to_user_id = tu.id
       WHERE s.from_user_id=? OR s.to_user_id=?
       ORDER BY s.id DESC`,
      [target, target]
    )
    res.json(Array.isArray(rows) ? rows : [])
  } catch (e) {
    console.error('GET /swaps error:', e.message)
    res.json([])
  }
})

router.put('/:id/status', authRequired, async (req, res) => {
  const { status } = req.body || {}
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [[swap]] = await conn.query('SELECT * FROM swaps WHERE id=? FOR UPDATE', [req.params.id])
    if (!swap) throw httpError(404, '交换请求不存在')
    if (!isAdmin(req) && !isSelf(req, swap.from_user_id) && !isSelf(req, swap.to_user_id)) {
      throw httpError(403, '无权操作该交换')
    }
    if (!(SWAP_TRANSITIONS[swap.status] || []).includes(status)) {
      throw httpError(400, `不能从「${swap.status}」改为「${status}」`)
    }
    await conn.query('UPDATE swaps SET status=? WHERE id=?', [status, swap.id])
    if (status === '已完成') await completeSwap(conn, swap)
    await conn.commit()
    res.json({ ok: true })
  } catch (e) {
    await conn.rollback()
    if (e.status) return res.status(e.status).json({ ok: false, msg: e.message })
    console.error('PUT /swaps/:id/status error:', e.message)
    res.status(500).json({ ok: false, msg: '操作失败' })
  } finally { conn.release() }
})

router.post('/:id/agree', authRequired, async (req, res) => {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [[swap]] = await conn.query('SELECT * FROM swaps WHERE id=? FOR UPDATE', [req.params.id])
    if (!swap) throw httpError(404, '交换请求不存在')
    if (!isSelf(req, swap.from_user_id) && !isSelf(req, swap.to_user_id)) throw httpError(403, '非本次交换参与者')
    if (swap.status !== '待确认') throw httpError(400, '当前状态无法同意')

    if (isSelf(req, swap.from_user_id)) {
      if (swap.from_agreed) throw httpError(400, '您已同意过此交换')
      await conn.query('UPDATE swaps SET from_agreed=1 WHERE id=?', [swap.id])
    } else {
      if (swap.to_agreed) throw httpError(400, '您已同意过此交换')
      await conn.query('UPDATE swaps SET to_agreed=1 WHERE id=?', [swap.id])
    }

    const [[updated]] = await conn.query('SELECT from_agreed, to_agreed FROM swaps WHERE id=?', [swap.id])
    if (updated.from_agreed && updated.to_agreed) {
      await conn.query("UPDATE swaps SET status='已同意' WHERE id=?", [swap.id])
    }
    await conn.commit()
    res.json({ ok: true })
  } catch (e) {
    await conn.rollback()
    if (e.status) return res.status(e.status).json({ ok: false, msg: e.message })
    console.error('POST /swaps/:id/agree error:', e.message)
    res.status(500).json({ ok: false, msg: '操作失败' })
  } finally { conn.release() }
})

router.post('/:id/reject', authRequired, async (req, res) => {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [[swap]] = await conn.query('SELECT * FROM swaps WHERE id=? FOR UPDATE', [req.params.id])
    if (!swap) throw httpError(404, '交换请求不存在')
    if (!isSelf(req, swap.from_user_id) && !isSelf(req, swap.to_user_id)) throw httpError(403, '非本次交换参与者')
    if (swap.status !== '待确认') throw httpError(400, '当前状态无法拒绝')
    await conn.query("UPDATE swaps SET status='已拒绝' WHERE id=?", [swap.id])
    await conn.commit()
    res.json({ ok: true })
  } catch (e) {
    await conn.rollback()
    if (e.status) return res.status(e.status).json({ ok: false, msg: e.message })
    console.error('POST /swaps/:id/reject error:', e.message)
    res.status(500).json({ ok: false, msg: '操作失败' })
  } finally { conn.release() }
})

router.put('/:id/admin-force-status', adminOnly, async (req, res) => {
  const { status } = req.body || {}
  const allowed = ['待确认', '已同意', '已拒绝', '已完成']
  if (!allowed.includes(status)) return res.status(400).json({ ok: false, msg: '无效的状态值' })
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [[swap]] = await conn.query('SELECT * FROM swaps WHERE id=? FOR UPDATE', [req.params.id])
    if (!swap) throw httpError(404, '交换请求不存在')
    await conn.query('UPDATE swaps SET status=? WHERE id=?', [status, swap.id])
    if (status === '已完成') await completeSwap(conn, swap)
    await conn.commit()
    res.json({ ok: true })
  } catch (e) {
    await conn.rollback()
    if (e.status) return res.status(e.status).json({ ok: false, msg: e.message })
    console.error('PUT /swaps/:id/admin-force-status error:', e.message)
    res.status(500).json({ ok: false, msg: '操作失败' })
  } finally { conn.release() }
})

export default router
