import { Router } from 'express'
import pool from '../db.js'
import { config } from '../config.js'
import { authRequired, isAdmin, isSelf, forbidden } from '../middleware/auth.js'

const router = Router()

const categoryColors = {
  '文学小说': ['#E74C3C', '#C0392B'], '科幻': ['#2C3E50', '#1A252F'],
  '外国文学': ['#8E44AD', '#6C3483'], '儿童文学': ['#F39C12', '#E67E22'],
  '历史社科': ['#795548', '#5D4037'], '经济管理': ['#2980B9', '#1F618D'],
  '推理悬疑': ['#1A1A2E', '#16213E'], '艺术设计': ['#E91E63', '#C2185B'],
  '自然科学': ['#009688', '#00796B'], '国学经典': ['#6D4C41', '#4E342E'],
  '心理学': ['#5C6BC0', '#3949AB'], '计算机技术': ['#37474F', '#263238'],
  '哲学宗教': ['#7B1FA2', '#4A148C'], '成功励志': ['#FF6F00', '#E65100'],
  '传记': ['#455A64', '#37474F'], '医学健康': ['#43A047', '#2E7D32'],
  '散文随笔': ['#26A69A', '#00897B'], '诗歌': ['#AB47BC', '#7B1FA2'],
  '政治法律': ['#546E7A', '#455A64'], '漫画绘本': ['#FF7043', '#E64A19'],
  '教育': ['#42A5F5', '#1E88E5'], '语言学习': ['#66BB6A', '#43A047'],
  '考试教辅': ['#78909C', '#546E7A'],
}

function pickColorPair(cat) {
  return categoryColors[cat] || ['#607D8B', '#455A64']
}

// 供前端兜底显示的 SVG 封面（无图片时使用）
router.get('/cover/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT name,author,category FROM books WHERE id=?', [req.params.id])
    if (!rows.length) { res.status(404).send('Not found'); return }
    const { name, author, category } = rows[0]
    const [c1, c2] = pickColorPair(category)
    const shortName = name.length > 6 ? name.slice(0, 6) + '...' : name
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="280" viewBox="0 0 200 280">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${c1}"/>
      <stop offset="100%" style="stop-color:${c2}"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="1" dy="1" stdDeviation="2" flood-opacity="0.3"/>
    </filter>
  </defs>
  <rect width="200" height="280" rx="6" fill="url(#bg)"/>
  <rect x="8" y="8" width="184" height="264" rx="3" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
  <line x1="30" y1="65" x2="170" y2="65" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
  <text x="100" y="48" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-size="11" font-family="sans-serif">${category}</text>
  <text x="100" y="130" text-anchor="middle" fill="white" font-size="${shortName.length > 4 ? 20 : 24}" font-weight="bold" font-family="sans-serif" filter="url(#shadow)">${shortName}</text>
  <text x="100" y="240" text-anchor="middle" fill="rgba(255,255,255,0.6)" font-size="11" font-family="sans-serif">${author}</text>
</svg>`
    res.setHeader('Content-Type', 'image/svg+xml')
    res.setHeader('Cache-Control', 'public, max-age=86400')
    res.send(svg)
  } catch { res.status(500).send('Error') }
})

router.get('/', async (req, res) => {
  const { category, keyword, sort, status, seller_name } = req.query
  try {
    let sql = 'SELECT * FROM books WHERE 1=1'
    const params = []
    if (category) { sql += ' AND category=?'; params.push(category) }
    if (status) { sql += ' AND status=?'; params.push(status) }
    if (seller_name) { sql += ' AND seller_name=?'; params.push(seller_name) }
    if (keyword) {
      sql += ' AND (name LIKE ? OR author LIKE ? OR description LIKE ?)'
      const k = `%${keyword}%`
      params.push(k, k, k)
    }
    if (sort === 'price-asc') sql += ' ORDER BY price ASC'
    else if (sort === 'price-desc') sql += ' ORDER BY price DESC'
    else if (sort === 'sales') sql += ' ORDER BY sales DESC'
    else if (sort === 'new') sql += ' ORDER BY id DESC'
    else sql += ' ORDER BY sales DESC'
    const [rows] = await pool.query(sql, params)
    res.json(Array.isArray(rows) ? rows : [])
  } catch (e) {
    console.error('GET /books error:', e.message)
    res.json([])
  }
})

router.get('/categories', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT DISTINCT category FROM books ORDER BY category')
    res.json(Array.isArray(rows) ? rows.map(r => r.category) : [])
  } catch (e) {
    console.error('GET /categories error:', e.message)
    res.json([])
  }
})

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM books WHERE id=?', [req.params.id])
    if (!rows.length) return res.status(404).json({ ok: false, msg: '未找到' })
    res.json(rows[0])
  } catch (e) {
    console.error('GET /books/:id error:', e.message)
    res.status(500).json({ ok: false, msg: '服务器内部错误' })
  }
})

router.post('/', authRequired, async (req, res) => {
  const { name, author, category, price, original_price, stock, condition_grade, cover, cover_url, description } = req.body || {}
  if (!name || !author) return res.json({ ok: false, msg: '书名和作者不能为空' })
  if (!(Number(price) > 0)) return res.json({ ok: false, msg: '售价必须大于 0' })
  try {
    const admin = isAdmin(req)
    // 卖家身份以 token 为准，前端传的 seller_id 一律忽略
    let sellerName = '平台官方'
    if (!admin) {
      const [[u]] = await pool.query('SELECT username FROM users WHERE id=?', [req.user.id])
      if (!u) return res.status(401).json({ ok: false, msg: '账号不存在' })
      sellerName = u.username
    } else if (req.body.seller_name) {
      sellerName = req.body.seller_name
    }
    const status = admin || !config.bookReview ? '在售' : '待审核'
    const [result] = await pool.query(
      'INSERT INTO books (name,author,category,price,original_price,stock,condition_grade,cover,cover_url,description,seller_id,seller_name,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [
        name, author, category || '其他', price, original_price || 0, Math.max(1, Number(stock) || 1),
        condition_grade || '轻微使用', cover || '📗', cover_url || '', description || '',
        req.user.id, sellerName, status,
      ]
    )
    res.json({ ok: true, id: result.insertId, status })
  } catch (e) {
    console.error('POST /books error:', e.message)
    res.status(500).json({ ok: false, msg: '发布失败' })
  }
})

router.put('/:id', authRequired, async (req, res) => {
  const [[book]] = await pool.query('SELECT id,seller_id FROM books WHERE id=?', [req.params.id])
  if (!book) return res.status(404).json({ ok: false, msg: '图书不存在' })
  const admin = isAdmin(req)
  const owner = book.seller_id != null && isSelf(req, book.seller_id)
  if (!admin && !owner) return forbidden(res)

  const userFields = ['name', 'author', 'category', 'price', 'original_price', 'stock', 'condition_grade', 'cover', 'cover_url', 'description', 'status']
  const adminFields = [...userFields, 'seller_name']

  // 卖家只能在自己的「在售 / 已下架」之间切换，不能自行审核通过
  if (!admin && req.body.status !== undefined && !['在售', '已下架'].includes(req.body.status)) {
    return forbidden(res, '无权修改该状态')
  }

  const fields = (admin ? adminFields : userFields).filter(f => req.body[f] !== undefined)
  if (!fields.length) return res.json({ ok: false, msg: '无更新字段' })

  const sets = fields.map(f => `${f}=?`)
  const vals = fields.map(f => req.body[f])
  try {
    await pool.query(`UPDATE books SET ${sets.join(',')} WHERE id=?`, [...vals, req.params.id])
    res.json({ ok: true })
  } catch (e) {
    console.error('PUT /books/:id error:', e.message)
    res.status(500).json({ ok: false, msg: '保存失败' })
  }
})

router.delete('/:id', authRequired, async (req, res) => {
  const [[book]] = await pool.query('SELECT id,seller_id FROM books WHERE id=?', [req.params.id])
  if (!book) return res.status(404).json({ ok: false, msg: '图书不存在' })
  if (!isAdmin(req) && !(book.seller_id != null && isSelf(req, book.seller_id))) return forbidden(res)
  try {
    await pool.query('DELETE FROM books WHERE id=?', [req.params.id])
    res.json({ ok: true })
  } catch (e) {
    console.error('DELETE /books/:id error:', e.message)
    res.status(500).json({ ok: false, msg: '删除失败' })
  }
})

router.get('/:id/favorites', authRequired, async (req, res) => {
  if (!isAdmin(req) && !isSelf(req, req.params.id)) return forbidden(res)
  try {
    const [rows] = await pool.query('SELECT book_id FROM favorites WHERE user_id=?', [req.params.id])
    res.json(Array.isArray(rows) ? rows.map(r => r.book_id) : [])
  } catch (e) {
    console.error('GET favorites error:', e.message)
    res.json([])
  }
})

router.post('/:id/favorite', authRequired, async (req, res) => {
  if (!isSelf(req, req.params.id)) return forbidden(res)
  const { bookId, add } = req.body || {}
  if (!bookId) return res.json({ ok: false, msg: '缺少图书参数' })
  try {
    if (add) {
      await pool.query('INSERT IGNORE INTO favorites (user_id,book_id) VALUES (?,?)', [req.params.id, bookId])
    } else {
      await pool.query('DELETE FROM favorites WHERE user_id=? AND book_id=?', [req.params.id, bookId])
    }
    res.json({ ok: true })
  } catch (e) {
    console.error('POST favorite error:', e.message)
    res.status(500).json({ ok: false, msg: '操作失败' })
  }
})

router.get('/:id/rating', async (req, res) => {
  try {
    const [avg] = await pool.query('SELECT ROUND(AVG(score),1) as avg, COUNT(*) as cnt FROM ratings WHERE book_id=?', [req.params.id])
    const { user_id } = req.query
    let mine = null
    if (user_id) {
      const [m] = await pool.query('SELECT score FROM ratings WHERE book_id=? AND user_id=?', [req.params.id, user_id])
      if (m.length) mine = m[0].score
    }
    res.json({ rating: avg[0].avg || 0, count: avg[0].cnt || 0, mine })
  } catch (e) {
    console.error('GET rating error:', e.message)
    res.json({ rating: 0, count: 0, mine: null })
  }
})

router.post('/:id/rate', authRequired, async (req, res) => {
  const { score } = req.body || {}
  if (!score || score < 1 || score > 5) return res.status(400).json({ ok: false, msg: '评分需在 1-5 之间' })
  try {
    await pool.query('INSERT INTO ratings (user_id,book_id,score) VALUES (?,?,?) ON DUPLICATE KEY UPDATE score=?', [
      req.user.id, req.params.id, score, score,
    ])
    const [avg] = await pool.query('SELECT ROUND(AVG(score),1) as avg FROM ratings WHERE book_id=?', [req.params.id])
    await pool.query('UPDATE books SET rating=? WHERE id=?', [avg[0].avg, req.params.id])
    res.json({ ok: true, rating: avg[0].avg })
  } catch (e) {
    console.error('POST rate error:', e.message)
    res.status(500).json({ ok: false, msg: '评分失败' })
  }
})

export default router
