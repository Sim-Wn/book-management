/**
 * 数据修复：默认只预览，加 --apply 才写入。
 *
 * 修复内容：
 *   1. categories 表缺少「其他」分类时补上
 *   2. 交换状态与双方确认标记矛盾时，按标记归位
 *   3. 有评分缓存但没有评分明细的书，评分清零
 *   4. 按「已完成订单」重算图书销量
 *
 * 用法：
 *   DB_NAME=shuyi node scripts/fix-data.mjs           # 预览
 *   DB_NAME=shuyi node scripts/fix-data.mjs --apply   # 写入
 */
import pool from '../db.js'

const apply = process.argv.includes('--apply')
const out = []
const log = (t) => out.push('  ' + t)

const conn = await pool.getConnection()
try {
  if (apply) await conn.beginTransaction()

  // 1. 分类
  const [[other]] = await conn.query("SELECT id FROM categories WHERE name='其他'")
  if (!other) {
    log('补充分类「其他」')
    if (apply) await conn.query("INSERT INTO categories (name, icon, sort_order) VALUES ('其他', '📚', 99)")
  } else {
    log('分类「其他」已存在')
  }

  // 2. 交换状态
  const [swaps] = await conn.query(`
    SELECT id, status, from_agreed, to_agreed FROM swaps
    WHERE (status='已同意' AND (from_agreed=0 OR to_agreed=0))
       OR (status='待确认' AND (from_agreed=1 AND to_agreed=1))
  `)
  for (const s of swaps) {
    const target = s.from_agreed && s.to_agreed ? '已同意' : '待确认'
    log(`交换 #${s.id}：${s.status} → ${target}（from_agreed=${s.from_agreed}, to_agreed=${s.to_agreed}）`)
    if (apply) await conn.query('UPDATE swaps SET status=? WHERE id=?', [target, s.id])
  }
  if (!swaps.length) log('交换状态一致')

  // 3. 评分缓存
  const [ghosts] = await conn.query(`
    SELECT b.id, b.name, b.rating FROM books b
    WHERE b.rating > 0 AND NOT EXISTS (SELECT 1 FROM ratings r WHERE r.book_id = b.id)
  `)
  for (const b of ghosts) {
    log(`图书 #${b.id}《${b.name}》：评分 ${b.rating} → 0（没有评分记录）`)
    if (apply) await conn.query('UPDATE books SET rating=0 WHERE id=?', [b.id])
  }
  if (!ghosts.length) log('评分缓存没有孤立值')

  // 4. 销量
  const [[{ c: diffCount }]] = await conn.query(`
    SELECT COUNT(*) AS c FROM (
      SELECT b.id, b.sales,
             COALESCE(SUM(CASE WHEN o.status='已完成' THEN oi.quantity ELSE 0 END), 0) AS expected
      FROM books b
      LEFT JOIN order_items oi ON oi.book_id = b.id
      LEFT JOIN orders o ON o.id = oi.order_id
      GROUP BY b.id, b.sales
      HAVING b.sales <> expected
    ) t
  `)
  log(`销量与已完成订单不一致：${diffCount} 本`)
  if (apply && diffCount > 0) {
    await conn.query(`
      UPDATE books b
      LEFT JOIN (
        SELECT oi.book_id, SUM(CASE WHEN o.status='已完成' THEN oi.quantity ELSE 0 END) AS q
        FROM order_items oi JOIN orders o ON o.id = oi.order_id
        GROUP BY oi.book_id
      ) t ON t.book_id = b.id
      SET b.sales = COALESCE(t.q, 0)
    `)
    log('已按已完成订单重算全部图书销量')
  }

  if (apply) {
    await conn.commit()
  }
} catch (e) {
  if (apply) await conn.rollback()
  console.error('修复失败：', e.message)
  process.exitCode = 1
} finally {
  conn.release()
}

console.log(`\n数据修复（${apply ? '已写入' : '预览模式，加 --apply 才会写入'}）`)
console.log(out.join('\n'))
await pool.end()
