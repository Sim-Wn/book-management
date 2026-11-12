import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import pool from '../db.js'
import { config } from '../config.js'
import { authRequired, adminOnly } from '../middleware/auth.js'
import { rateLimit } from '../middleware/rateLimit.js'

const router = Router()

const USERNAME_RE = /^[\u4e00-\u9fa5A-Za-z0-9_]{2,20}$/

function publicUser(u) {
  return {
    id: u.id,
    username: u.username,
    email: u.email || '',
    phone: u.phone || '',
    address: u.address || '',
    bio: u.bio || '',
    avatar: u.avatar || '',
  }
}

router.post('/login', rateLimit({ max: 10, key: (req) => `login:${req.ip}:${req.body?.username || ''}` }), async (req, res) => {
  const { username, password } = req.body || {}
  if (!username || !password) return res.json({ ok: false, msg: '请输入账号和密码' })
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE username=?', [username])
    if (!rows.length) return res.json({ ok: false, msg: '账号或密码错误' })
    const user = rows[0]
    if (user.disabled) return res.json({ ok: false, msg: '账号已被禁用' })
    const hash = user.passwd || user.password
    if (!hash) return res.json({ ok: false, msg: '账号数据异常' })
    const valid = await bcrypt.compare(password, hash)
    if (!valid) return res.json({ ok: false, msg: '账号或密码错误' })

    const role = user.role === 'admin' ? 'admin' : 'user'
    const token = jwt.sign({ id: user.id, role }, config.jwtSecret, { expiresIn: '7d' })
    if (role === 'admin') {
      return res.json({ ok: true, role, token, user: { id: user.id, username: user.username } })
    }
    res.json({ ok: true, role, token, user: publicUser(user) })
  } catch (e) {
    console.error('POST /login error:', e.message)
    res.status(500).json({ ok: false, msg: '服务器内部错误' })
  }
})

router.post('/register', rateLimit({ max: 10, key: (req) => `register:${req.ip}` }), async (req, res) => {
  const { username, password, phone } = req.body || {}
  if (!USERNAME_RE.test(username || '')) return res.json({ ok: false, msg: '用户名需 2-20 位中文、字母、数字或下划线' })
  if (typeof password !== 'string' || password.length < 6) return res.json({ ok: false, msg: '密码至少 6 位' })
  try {
    const [exist] = await pool.query('SELECT id FROM users WHERE username=?', [username])
    if (exist.length) return res.json({ ok: false, msg: '用户名已存在' })
    const hash = await bcrypt.hash(password, 10)
    await pool.query('INSERT INTO users (username,passwd,phone) VALUES (?,?,?)', [username, hash, phone || ''])
    res.json({ ok: true })
  } catch (e) {
    console.error('POST /register error:', e.message)
    res.status(500).json({ ok: false, msg: '注册失败' })
  }
})

// 用当前 token 换取最新的用户信息，也可以用来校验 token 是否仍然有效
router.get('/me', authRequired, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id,username,email,phone,address,bio,avatar,role,disabled,created_at FROM users WHERE id=?',
      [req.user.id]
    )
    if (!rows.length) return res.status(401).json({ ok: false, msg: '账号不存在' })
    const u = rows[0]
    if (u.disabled) return res.status(401).json({ ok: false, msg: '账号已被禁用' })
    res.json({ ...publicUser(u), role: u.role })
  } catch (e) {
    console.error('GET /me error:', e.message)
    res.status(500).json({ ok: false, msg: '服务器内部错误' })
  }
})

router.put('/profile', authRequired, async (req, res) => {
  const { username, phone, email, address, bio, avatar } = req.body || {}
  const userId = req.user.id
  if (!USERNAME_RE.test(username || '')) return res.json({ ok: false, msg: '用户名格式不正确' })
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    await conn.query('UPDATE users SET username=?, phone=?, email=?, address=?, bio=?, avatar=? WHERE id=?', [
      username, phone || '', email || '', address || '', bio || '', avatar || '', userId,
    ])
    await conn.query('UPDATE books SET seller_name=? WHERE seller_id=?', [username, userId])
    await conn.query('UPDATE messages SET sender_name=? WHERE sender_id=?', [username, userId])
    await conn.commit()
    res.json({ ok: true })
  } catch (e) {
    await conn.rollback()
    if (e.code === 'ER_DUP_ENTRY') return res.json({ ok: false, msg: '用户名已被占用' })
    console.error('PUT /profile error:', e.message)
    res.status(500).json({ ok: false, msg: '保存失败' })
  } finally { conn.release() }
})

router.get('/users', adminOnly, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id,username,email,phone,role,disabled,created_at FROM users WHERE role=? ORDER BY id',
      ['user']
    )
    res.json(Array.isArray(rows) ? rows : [])
  } catch (e) {
    console.error('GET /users error:', e.message)
    res.json([])
  }
})

router.put('/users/:id/toggle', adminOnly, async (req, res) => {
  const conn = await pool.getConnection()
  try {
    const [[user]] = await conn.query('SELECT disabled FROM users WHERE id=? AND role=?', [req.params.id, 'user'])
    if (!user) return res.status(404).json({ ok: false, msg: '用户不存在' })
    const newDisabled = user.disabled ? 0 : 1
    await conn.beginTransaction()
    await conn.query('UPDATE users SET disabled=? WHERE id=?', [newDisabled, req.params.id])
    // 禁用时下架该用户所有在售书籍
    if (newDisabled) {
      await conn.query("UPDATE books SET status='已下架' WHERE seller_id=? AND status='在售'", [req.params.id])
    }
    await conn.commit()
    res.json({ ok: true })
  } catch (e) {
    await conn.rollback()
    console.error('PUT /users/:id/toggle error:', e.message)
    res.status(500).json({ ok: false, msg: '操作失败' })
  } finally { conn.release() }
})

router.delete('/users/:id', adminOnly, async (req, res) => {
  const conn = await pool.getConnection()
  try {
    const [[user]] = await conn.query('SELECT id FROM users WHERE id=? AND role=?', [req.params.id, 'user'])
    if (!user) return res.status(404).json({ ok: false, msg: '用户不存在' })
    await conn.beginTransaction()
    // 下架该用户所有在售书籍（seller_id 会被 ON DELETE SET NULL 置空）
    await conn.query("UPDATE books SET status='已下架' WHERE seller_id=?", [req.params.id])
    await conn.query('DELETE FROM users WHERE id=?', [req.params.id])
    await conn.commit()
    res.json({ ok: true })
  } catch (e) {
    await conn.rollback()
    console.error('DELETE /users/:id error:', e.message)
    res.status(500).json({ ok: false, msg: '删除失败' })
  } finally { conn.release() }
})

export default router
