import { Router } from 'express'
import pool from '../db.js'
import { authRequired, isAdmin, isSelf, forbidden } from '../middleware/auth.js'

const router = Router()

async function usernameOf(userId) {
  const [[u]] = await pool.query('SELECT username FROM users WHERE id=?', [userId])
  return u?.username || '用户'
}

router.get('/posts', async (req, res) => {
  const { user_id } = req.query
  try {
    let sql = 'SELECT * FROM forum_posts'
    const params = []
    if (user_id) { sql += ' WHERE user_id=?'; params.push(user_id) }
    sql += ' ORDER BY is_pinned DESC, updated_at DESC'
    const [rows] = await pool.query(sql, params)
    res.json(Array.isArray(rows) ? rows : [])
  } catch (e) {
    console.error('GET /forum/posts error:', e.message)
    res.json([])
  }
})

router.get('/posts/:id', async (req, res) => {
  try {
    await pool.query('UPDATE forum_posts SET view_count = view_count + 1 WHERE id=?', [req.params.id])
    const [[post]] = await pool.query('SELECT * FROM forum_posts WHERE id=?', [req.params.id])
    if (!post) return res.status(404).json({ ok: false, msg: '帖子不存在' })
    const [replies] = await pool.query('SELECT * FROM forum_replies WHERE post_id=? ORDER BY id ASC', [req.params.id])
    post.replies = Array.isArray(replies) ? replies : []
    res.json(post)
  } catch (e) {
    console.error('GET /forum/posts/:id error:', e.message)
    res.status(500).json({ ok: false, msg: '加载失败' })
  }
})

router.post('/posts', authRequired, async (req, res) => {
  const { title, content } = req.body || {}
  if (!title || !String(title).trim()) return res.json({ ok: false, msg: '标题不能为空' })
  if (!content || !String(content).trim()) return res.json({ ok: false, msg: '内容不能为空' })
  try {
    const userName = await usernameOf(req.user.id)
    const [result] = await pool.query(
      'INSERT INTO forum_posts (user_id, user_name, title, content) VALUES (?,?,?,?)',
      [req.user.id, userName, String(title).trim(), String(content).trim()]
    )
    res.json({ ok: true, id: result.insertId })
  } catch (e) {
    console.error('POST /forum/posts error:', e.message)
    res.status(500).json({ ok: false, msg: '发布失败' })
  }
})

router.put('/posts/:id', authRequired, async (req, res) => {
  const [[post]] = await pool.query('SELECT user_id FROM forum_posts WHERE id=?', [req.params.id])
  if (!post) return res.status(404).json({ ok: false, msg: '帖子不存在' })
  if (!isAdmin(req) && !isSelf(req, post.user_id)) return forbidden(res)
  const { title, content } = req.body || {}
  try {
    const sets = []
    const vals = []
    if (title !== undefined) { sets.push('title=?'); vals.push(title) }
    if (content !== undefined) { sets.push('content=?'); vals.push(content) }
    if (!sets.length) return res.json({ ok: false, msg: '无更新字段' })
    sets.push('updated_at=NOW()')
    await pool.query(`UPDATE forum_posts SET ${sets.join(',')} WHERE id=?`, [...vals, req.params.id])
    res.json({ ok: true })
  } catch (e) {
    console.error('PUT /forum/posts/:id error:', e.message)
    res.status(500).json({ ok: false, msg: '保存失败' })
  }
})

router.delete('/posts/:id', authRequired, async (req, res) => {
  const [[post]] = await pool.query('SELECT user_id FROM forum_posts WHERE id=?', [req.params.id])
  if (!post) return res.status(404).json({ ok: false, msg: '帖子不存在' })
  if (!isAdmin(req) && !isSelf(req, post.user_id)) return forbidden(res)
  try {
    await pool.query('DELETE FROM forum_posts WHERE id=?', [req.params.id])
    res.json({ ok: true })
  } catch (e) {
    console.error('DELETE /forum/posts/:id error:', e.message)
    res.status(500).json({ ok: false, msg: '删除失败' })
  }
})

router.post('/posts/:id/replies', authRequired, async (req, res) => {
  const content = req.body?.content
  if (!content || !String(content).trim()) return res.json({ ok: false, msg: '回复内容不能为空' })
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const userName = await usernameOf(req.user.id)
    await conn.query(
      'INSERT INTO forum_replies (post_id, user_id, user_name, content) VALUES (?,?,?,?)',
      [req.params.id, req.user.id, userName, String(content).trim()]
    )
    await conn.query('UPDATE forum_posts SET reply_count = reply_count + 1 WHERE id=?', [req.params.id])
    await conn.commit()
    res.json({ ok: true })
  } catch (e) {
    await conn.rollback()
    console.error('POST /forum/posts/:id/replies error:', e.message)
    res.status(500).json({ ok: false, msg: '回复失败' })
  } finally { conn.release() }
})

router.delete('/replies/:id', authRequired, async (req, res) => {
  const conn = await pool.getConnection()
  try {
    const [[reply]] = await conn.query('SELECT id,post_id,user_id FROM forum_replies WHERE id=?', [req.params.id])
    if (!reply) return res.status(404).json({ ok: false, msg: '回复不存在' })
    if (!isAdmin(req) && !isSelf(req, reply.user_id)) return forbidden(res)
    await conn.beginTransaction()
    await conn.query('DELETE FROM forum_replies WHERE id=?', [req.params.id])
    // 同步修正回复数，避免越删越多
    await conn.query('UPDATE forum_posts SET reply_count = GREATEST(reply_count - 1, 0) WHERE id=?', [reply.post_id])
    await conn.commit()
    res.json({ ok: true })
  } catch (e) {
    await conn.rollback()
    console.error('DELETE /forum/replies/:id error:', e.message)
    res.status(500).json({ ok: false, msg: '删除失败' })
  } finally { conn.release() }
})

export default router
