/**
 * 给 ratings 表补 comment 字段（文字评价）。可重复执行。
 *
 * 用法：
 *   DB_NAME=shuyi npm run migrate:rating
 *   DB_NAME=shuyi_test npm run migrate:rating
 */
import pool from '../db.js'

const [cols] = await pool.query(
  "SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='ratings'"
)
const names = cols.map((c) => c.COLUMN_NAME)
if (names.includes('comment')) {
  console.log('ratings.comment 已存在，无需迁移')
} else {
  await pool.query('ALTER TABLE ratings ADD COLUMN comment VARCHAR(500) DEFAULT NULL AFTER score')
  console.log('已新增 ratings.comment')
}
await pool.end()
