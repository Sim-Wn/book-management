import { Router } from 'express'
import pool from '../db.js'
import { adminOnly } from '../middleware/auth.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM categories ORDER BY sort_order, id')
    res.json(Array.isArray(rows) ? rows : [])
  } catch (e) {
    console.error('GET /categories error:', e.message)
    res.json([])
  }
})

router.post('/', adminOnly, async (req, res) => {
  const { name, icon, sort_order } = req.body || {}
  if (!name) return res.json({ ok: false, msg: '分类名称不能为空' })
  try {
    const [result] = await pool.query(
      'INSERT INTO categories (name, icon, sort_order) VALUES (?,?,?)',
      [name, icon || '📚', sort_order || 0]
    )
    res.json({ ok: true, id: result.insertId })
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.json({ ok: false, msg: '分类已存在' })
    console.error('POST /categories error:', e.message)
    res.status(500).json({ ok: false, msg: '添加失败' })
  }
})

router.put('/:id', adminOnly, async (req, res) => {
  const { name, icon, sort_order } = req.body || {}
  try {
    const sets = []
    const vals = []
    if (name !== undefined) { sets.push('name=?'); vals.push(name) }
    if (icon !== undefined) { sets.push('icon=?'); vals.push(icon) }
    if (sort_order !== undefined) { sets.push('sort_order=?'); vals.push(sort_order) }
    if (!sets.length) return res.json({ ok: false, msg: '无更新字段' })
    await pool.query(`UPDATE categories SET ${sets.join(',')} WHERE id=?`, [...vals, req.params.id])
    res.json({ ok: true })
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.json({ ok: false, msg: '分类已存在' })
    console.error('PUT /categories/:id error:', e.message)
    res.status(500).json({ ok: false, msg: '保存失败' })
  }
})

router.delete('/:id', adminOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM categories WHERE id=?', [req.params.id])
    res.json({ ok: true })
  } catch (e) {
    console.error('DELETE /categories/:id error:', e.message)
    res.status(500).json({ ok: false, msg: '删除失败' })
  }
})

export default router
