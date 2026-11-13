/**
 * 数据体检：只读检查数据一致性，不修改任何数据。
 *
 * 用法：DB_NAME=shuyi node scripts/audit-data.mjs
 */
import pool from '../db.js'

const list = async (sql) => (await pool.query(sql))[0]
const one = async (sql) => {
  const [rows] = await pool.query(sql)
  return rows[0] ? Object.values(rows[0])[0] : 0
}

const rows = []
const section = (t) => rows.push('\n## ' + t)
const line = (t) => rows.push('  ' + t)
const flag = (ok, text) => rows.push(`  ${ok ? '✅' : '⚠️ '} ${text}`)

// 1. 基础数量
const users = await one("SELECT COUNT(*) FROM users WHERE role='user'")
const admins = await one("SELECT COUNT(*) FROM users WHERE role='admin'")
const books = await one('SELECT COUNT(*) FROM books')
const orders = await one('SELECT COUNT(*) FROM orders')
const items = await one('SELECT COUNT(*) FROM order_items')
const favorites = await one('SELECT COUNT(*) FROM favorites')
const ratings = await one('SELECT COUNT(*) FROM ratings')
const categories = await one('SELECT COUNT(*) FROM categories')
const swaps = await one('SELECT COUNT(*) FROM swaps')
const messages = await one('SELECT COUNT(*) FROM messages')
const posts = await one('SELECT COUNT(*) FROM forum_posts')

section('基础数量')
line(`用户 ${users}（管理员 ${admins}） · 图书 ${books} · 订单 ${orders}（明细 ${items}）`)
line(`收藏 ${favorites} · 评分 ${ratings} · 分类 ${categories} · 交换 ${swaps} · 消息 ${messages} · 帖子 ${posts}`)

// 2. 图书状态分布
section('图书状态分布')
for (const r of await list('SELECT status, COUNT(*) c FROM books GROUP BY status ORDER BY c DESC')) {
  line(`${r.status}: ${r.c}`)
}

// 3. 分类一致性
section('分类一致性')
const bookCats = (await list('SELECT DISTINCT category FROM books')).map((r) => r.category).filter(Boolean)
const catNames = (await list('SELECT name FROM categories')).map((r) => r.name)
const missing = bookCats.filter((c) => !catNames.includes(c))
flag(missing.length === 0, missing.length ? `图书分类不在 categories 表：${missing.join('、')}` : '图书分类都能在 categories 表找到')
const emptyCats = catNames.filter((n) => !bookCats.includes(n))
flag(emptyCats.length === 0, emptyCats.length ? `categories 表里没有图书的分类：${emptyCats.join('、')}` : '每个分类下都有图书')

// 4. 数值异常
section('数值异常')
const neg = await one('SELECT COUNT(*) FROM books WHERE stock < 0 OR sales < 0 OR price <= 0')
flag(Number(neg) === 0, `库存/销量为负或售价非正：${neg} 本`)
const over = await one('SELECT COUNT(*) FROM books WHERE original_price > 0 AND price > original_price * 1.5')
flag(Number(over) === 0, `售价高于原价 1.5 倍以上：${over} 本`)
const noCover = await one("SELECT COUNT(*) FROM books WHERE (cover IS NULL OR cover='') AND (cover_url IS NULL OR cover_url='')")
flag(Number(noCover) === 0, `没有任何封面信息的书：${noCover} 本`)

// 5. 评分缓存
section('评分缓存 books.rating vs ratings 表')
const ratingDiff = await list(`
  SELECT b.id, b.name, b.rating AS cached, ROUND(AVG(r.score),1) AS actual
  FROM books b JOIN ratings r ON r.book_id = b.id
  GROUP BY b.id, b.name, b.rating
  HAVING b.rating <> ROUND(AVG(r.score),1)
`)
flag(
  ratingDiff.length === 0,
  ratingDiff.length
    ? `评分缓存与明细不一致：${ratingDiff.length} 本（例：${ratingDiff.slice(0, 3).map((r) => `#${r.id} ${r.cached}→${r.actual}`).join('，')}）`
    : '评分缓存全部一致'
)
const ghostRating = await one(
  'SELECT COUNT(*) FROM books b WHERE b.rating > 0 AND NOT EXISTS (SELECT 1 FROM ratings r WHERE r.book_id = b.id)'
)
flag(Number(ghostRating) === 0, `有评分但没有评分记录的书：${ghostRating} 本`)
const badScore = await one('SELECT COUNT(*) FROM ratings WHERE score < 1 OR score > 5')
flag(Number(badScore) === 0, `评分超出 1-5：${badScore} 条`)
const dupRatings = await list('SELECT user_id, book_id, COUNT(*) c FROM ratings GROUP BY user_id, book_id HAVING c > 1')
flag(dupRatings.length === 0, `同一用户对同一本书重复评分：${dupRatings.length} 组`)

// 6. 销量 vs 已完成订单
section('销量 books.sales vs 已完成订单')
const salesDiffCount = await one(`
  SELECT COUNT(*) FROM (
    SELECT b.id, b.sales
    FROM books b
    LEFT JOIN order_items oi ON oi.book_id = b.id
    LEFT JOIN orders o ON o.id = oi.order_id
    GROUP BY b.id, b.sales
    HAVING b.sales <> COALESCE(SUM(CASE WHEN o.status='已完成' THEN oi.quantity ELSE 0 END), 0)
  ) t
`)
const salesSamples = await list(`
  SELECT b.id, b.name, b.sales,
         COALESCE(SUM(CASE WHEN o.status='已完成' THEN oi.quantity ELSE 0 END), 0) AS expected
  FROM books b
  LEFT JOIN order_items oi ON oi.book_id = b.id
  LEFT JOIN orders o ON o.id = oi.order_id
  GROUP BY b.id, b.name, b.sales
  HAVING b.sales <> expected
  ORDER BY ABS(b.sales - expected) DESC
  LIMIT 5
`)
flag(
  Number(salesDiffCount) === 0,
  `销量与已完成订单不一致：${salesDiffCount} 本${salesSamples.length ? '（例 ' + salesSamples.map((r) => `#${r.id} ${r.sales}→${r.expected}`).join('，') + '）' : ''}`
)

// 7. 订单金额 vs 明细
section('订单金额 orders.total vs 明细')
const totalDiffCount = await one(`
  SELECT COUNT(*) FROM (
    SELECT o.id FROM orders o JOIN order_items oi ON oi.order_id = o.id
    GROUP BY o.id, o.total
    HAVING ABS(o.total - SUM(oi.price * oi.quantity)) > 0.01
  ) t
`)
const totalSamples = await list(`
  SELECT o.id, o.total, ROUND(SUM(oi.price * oi.quantity), 2) AS expected
  FROM orders o JOIN order_items oi ON oi.order_id = o.id
  GROUP BY o.id, o.total
  HAVING ABS(o.total - SUM(oi.price * oi.quantity)) > 0.01
  LIMIT 5
`)
flag(
  Number(totalDiffCount) === 0,
  `订单总额与明细不一致：${totalDiffCount} 单${totalSamples.length ? '（例 ' + totalSamples.map((r) => `#${r.id} ${r.total}→${r.expected}`).join('，') + '）' : ''}`
)

// 8. 关联完整性
section('关联完整性')
const orphanItems = await one('SELECT COUNT(*) FROM order_items oi LEFT JOIN books b ON b.id = oi.book_id WHERE b.id IS NULL')
flag(Number(orphanItems) === 0, `订单明细指向已删除图书：${orphanItems} 条`)
const orphanFav = await one('SELECT COUNT(*) FROM favorites f LEFT JOIN books b ON b.id = f.book_id WHERE b.id IS NULL')
flag(Number(orphanFav) === 0, `收藏指向已删除图书：${orphanFav} 条`)
const dupFav = await list('SELECT user_id, book_id, COUNT(*) c FROM favorites GROUP BY user_id, book_id HAVING c > 1')
flag(dupFav.length === 0, `重复收藏记录：${dupFav.length} 组`)
const dupOrderNo = await one('SELECT COUNT(*) FROM (SELECT order_no FROM orders GROUP BY order_no HAVING COUNT(*) > 1) t')
flag(Number(dupOrderNo) === 0, `重复订单号：${dupOrderNo} 个`)
const sellerMismatchCount = await one(`
  SELECT COUNT(*) FROM books b JOIN users u ON u.id = b.seller_id WHERE b.seller_name <> u.username
`)
const sellerSamples = await list(`
  SELECT b.id, b.seller_name, u.username
  FROM books b JOIN users u ON u.id = b.seller_id
  WHERE b.seller_name <> u.username LIMIT 3
`)
flag(
  Number(sellerMismatchCount) === 0,
  `图书卖家名与用户表不一致：${sellerMismatchCount} 本${sellerSamples.length ? '（例 ' + sellerSamples.map((r) => `#${r.id} ${r.seller_name}→${r.username}`).join('，') + '）' : ''}`
)

// 9. 交换一致性
section('交换一致性')
const swapBad = await list(`
  SELECT id, status, from_agreed, to_agreed FROM swaps
  WHERE (status='已同意' AND (from_agreed=0 OR to_agreed=0))
     OR (status='待确认' AND (from_agreed=1 AND to_agreed=1))
  LIMIT 5
`)
flag(swapBad.length === 0, swapBad.length ? `交换状态与双方确认标记矛盾：${swapBad.length} 条` : '交换状态与确认标记一致')

// 10. 论坛回复数
section('论坛回复数')
const replyDiffCount = await one(`
  SELECT COUNT(*) FROM (
    SELECT p.id FROM forum_posts p LEFT JOIN forum_replies r ON r.post_id = p.id
    GROUP BY p.id, p.reply_count HAVING p.reply_count <> COUNT(r.id)
  ) t
`)
flag(Number(replyDiffCount) === 0, `帖子回复数不一致：${replyDiffCount} 条`)

// 11. 用户资料
section('用户资料')
line(`没有手机号的普通用户：${await one("SELECT COUNT(*) FROM users WHERE role='user' AND (phone IS NULL OR phone='')")}`)
line(`没有邮箱的普通用户：${await one("SELECT COUNT(*) FROM users WHERE role='user' AND (email IS NULL OR email='')")}`)
const dupName = await one('SELECT COUNT(*) FROM (SELECT username FROM users GROUP BY username HAVING COUNT(*) > 1) t')
flag(Number(dupName) === 0, `重复用户名：${dupName} 个`)

// 12. 文本异常
section('文本异常')
const badText = await one("SELECT COUNT(*) FROM books WHERE name LIKE '%?%' OR description LIKE '%?%'")
flag(Number(badText) === 0, `书名/简介里出现 ? 号（可能是编码问题）：${badText} 本`)

console.log(rows.join('\n'))
await pool.end()
