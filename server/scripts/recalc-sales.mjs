/**
 * 按「已完成订单」重算图书销量。
 *
 * 旧版本在「下单」时就累加销量，取消/退货也不会回滚，导致销量虚高。
 * 新版本只在订单完成时累加，这个脚本用于把历史数据对齐。
 *
 * 用法：
 *   DB_NAME=shuyi node scripts/recalc-sales.mjs          # 只对比，不写库
 *   DB_NAME=shuyi node scripts/recalc-sales.mjs --apply  # 实际写入
 */
import pool from '../db.js'

const apply = process.argv.includes('--apply')

const [rows] = await pool.query(
  `SELECT b.id, b.name, b.sales,
          COALESCE(SUM(CASE WHEN o.status = '已完成' THEN oi.quantity ELSE 0 END), 0) AS expected
   FROM books b
   LEFT JOIN order_items oi ON oi.book_id = b.id
   LEFT JOIN orders o ON o.id = oi.order_id
   GROUP BY b.id, b.name, b.sales
   ORDER BY b.id`
)

const diff = rows.filter((r) => Number(r.sales) !== Number(r.expected))
console.log(`共 ${rows.length} 本书，需要修正 ${diff.length} 本`)
for (const r of diff.slice(0, 20)) {
  console.log(`  #${r.id} 《${r.name}》 ${r.sales} -> ${r.expected}`)
}
if (diff.length > 20) console.log(`  ... 其余 ${diff.length - 20} 本略`)

if (!apply) {
  console.log('\n（预览模式，未写入。加 --apply 才会更新数据库）')
} else if (diff.length) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    for (const r of diff) {
      await conn.query('UPDATE books SET sales=? WHERE id=?', [r.expected, r.id])
    }
    await conn.commit()
    console.log(`\n✅ 已更新 ${diff.length} 本书的销量`)
  } catch (e) {
    await conn.rollback()
    console.error('❌ 更新失败:', e.message)
    process.exitCode = 1
  } finally {
    conn.release()
  }
}

await pool.end()
