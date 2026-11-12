import { Router } from 'express'
import pool from '../db.js'

const router = Router()

// 公开的聚合统计，供首页/控制台展示，不暴露任何用户明细
router.get('/', async (req, res) => {
  try {
    const [[books]] = await pool.query("SELECT COUNT(*) AS c FROM books WHERE status='在售'")
    const [[categories]] = await pool.query('SELECT COUNT(*) AS c FROM categories')
    const [[users]] = await pool.query("SELECT COUNT(*) AS c FROM users WHERE role='user' AND disabled=0")
    const [[orders]] = await pool.query('SELECT COUNT(*) AS c FROM orders')
    res.json({
      booksOnSale: books.c,
      categories: categories.c,
      users: users.c,
      orders: orders.c,
    })
  } catch (e) {
    console.error('GET /stats error:', e.message)
    res.json({ booksOnSale: 0, categories: 0, users: 0, orders: 0 })
  }
})

export default router
