/**
 * 逻辑备份：把当前库整表复制到一个带时间戳的备份库。
 *
 * 用法：DB_NAME=shuyi node scripts/backup-db.mjs
 */
import pool from '../db.js'

const src = process.env.DB_NAME || 'shuyi'
if (!/^[A-Za-z0-9_]+$/.test(src)) {
  console.error('数据库名不合法：' + src)
  process.exit(1)
}

const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
const dst = `${src}_backup_${ts}`

const [tables] = await pool.query(
  "SELECT TABLE_NAME AS t FROM information_schema.tables WHERE table_schema=? AND TABLE_TYPE='BASE TABLE'",
  [src]
)
if (!tables.length) {
  console.error('没有找到表，检查 DB_NAME 是否正确')
  process.exit(1)
}

await pool.query(`CREATE DATABASE \`${dst}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
for (const { t } of tables) {
  await pool.query(`CREATE TABLE \`${dst}\`.\`${t}\` LIKE \`${src}\`.\`${t}\``)
  await pool.query(`INSERT INTO \`${dst}\`.\`${t}\` SELECT * FROM \`${src}\`.\`${t}\``)
}

console.log(`✅ 已备份 ${src} → ${dst}（${tables.length} 张表）`)
await pool.end()
