import { Router } from 'express'
import pool from '../db.js'
import { authRequired, isAdmin, isSelf, forbidden } from '../middleware/auth.js'

const router = Router()

async function usernameOf(userId) {
  const [[u]] = await pool.query('SELECT username FROM users WHERE id=?', [userId])
  return u?.username || '用户'
}

router.get('/', authRequired, async (req, res) => {
  const { order_id, swap_id, user_id } = req.query
  try {
    let sql = 'SELECT * FROM messages WHERE 1=1'
    const params = []
    if (order_id) { sql += ' AND order_id=?'; params.push(order_id) }
    if (swap_id) { sql += ' AND swap_id=?'; params.push(swap_id) }
    if (isAdmin(req)) {
      if (user_id) { sql += ' AND (sender_id=? OR receiver_id=?)'; params.push(user_id, user_id) }
    } else {
      // 普通用户只能看到与自己相关的消息
      sql += ' AND (sender_id=? OR receiver_id=? OR order_id IN (SELECT id FROM orders WHERE user_id=?) OR swap_id IN (SELECT id FROM swaps WHERE from_user_id=? OR to_user_id=?))'
      params.push(req.user.id, req.user.id, req.user.id, req.user.id, req.user.id)
    }
    sql += ' ORDER BY id ASC'
    const [rows] = await pool.query(sql, params)
    res.json(Array.isArray(rows) ? rows : [])
  } catch (e) {
    console.error('GET /messages error:', e.message)
    res.json([])
  }
})

router.get('/conversations', authRequired, async (req, res) => {
  const qid = req.query.user_id
  if (qid && !isAdmin(req) && !isSelf(req, qid)) return forbidden(res)
  const target = qid || req.user.id
  try {
    const [rows] = await pool.query(
      `SELECT
        CASE WHEN sender_id=? THEN receiver_id ELSE sender_id END AS peer_id,
        (SELECT username FROM users WHERE id = CASE WHEN sender_id=? THEN receiver_id ELSE sender_id END) AS peer_name,
        MAX(id) AS last_msg_id,
        MAX(created_at) AS last_time,
        COUNT(*) AS msg_count,
        SUM(CASE WHEN receiver_id=? AND is_read=0 THEN 1 ELSE 0 END) AS unread_count
      FROM messages
      WHERE receiver_id IS NOT NULL AND (sender_id=? OR receiver_id=?)
      GROUP BY peer_id
      ORDER BY last_time DESC`,
      [target, target, target, target, target]
    )
    res.json(Array.isArray(rows) ? rows : [])
  } catch (e) {
    console.error('GET /messages/conversations error:', e.message)
    res.json([])
  }
})

router.get('/pm', authRequired, async (req, res) => {
  let { sender_id, receiver_id } = req.query
  if (!sender_id && !receiver_id) return res.json([])
  if (!isAdmin(req)) {
    if (!isSelf(req, sender_id) && !isSelf(req, receiver_id)) return forbidden(res)
    // 普通用户强制以自己的身份查询
    if (!isSelf(req, sender_id)) { receiver_id = sender_id; sender_id = req.user.id }
    else { receiver_id = receiver_id || req.user.id }
  }
  try {
    const [rows] = await pool.query(
      `SELECT * FROM messages
       WHERE receiver_id IS NOT NULL
       AND ((sender_id=? AND receiver_id=?) OR (sender_id=? AND receiver_id=?))
       ORDER BY id ASC`,
      [sender_id, receiver_id, receiver_id, sender_id]
    )
    res.json(Array.isArray(rows) ? rows : [])
  } catch (e) {
    console.error('GET /messages/pm error:', e.message)
    res.json([])
  }
})

router.post('/', authRequired, async (req, res) => {
  const { order_id, swap_id, receiver_id, content } = req.body || {}
  if (!order_id && !swap_id && !receiver_id) return res.json({ ok: false, msg: '需提供 order_id/swap_id/receiver_id 之一' })
  if (!content || !String(content).trim()) return res.json({ ok: false, msg: '消息内容不能为空' })
  try {
    const senderName = await usernameOf(req.user.id)
    const [result] = await pool.query(
      'INSERT INTO messages (order_id, swap_id, sender_id, receiver_id, sender_name, sender_role, content) VALUES (?,?,?,?,?,?,?)',
      [order_id || null, swap_id || null, req.user.id, receiver_id || null, senderName, req.user.role || 'user', String(content).trim()]
    )
    res.json({ ok: true, id: result.insertId })
  } catch (e) {
    console.error('POST /messages error:', e.message)
    res.status(500).json({ ok: false, msg: '发送失败' })
  }
})

router.put('/read', authRequired, async (req, res) => {
  const { receiver_id, sender_id } = req.body || {}
  if (!receiver_id || !sender_id) return res.json({ ok: false, msg: '缺少参数' })
  if (!isSelf(req, receiver_id)) return forbidden(res)
  try {
    const [result] = await pool.query(
      'UPDATE messages SET is_read=1 WHERE sender_id=? AND receiver_id=? AND is_read=0',
      [sender_id, receiver_id]
    )
    res.json({ ok: true, updated: result.affectedRows })
  } catch (e) {
    console.error('PUT /messages/read error:', e.message)
    res.status(500).json({ ok: false, msg: '操作失败' })
  }
})

export default router
