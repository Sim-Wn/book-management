import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envFile = path.join(__dirname, '.env')

// 读取 server/.env。
// Node 20.12+ 内置 process.loadEnvFile；低版本用极简解析兜底，避免额外安装 dotenv。
function loadEnv() {
  if (!fs.existsSync(envFile)) return
  if (typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(envFile)
    return
  }
  const text = fs.readFileSync(envFile, 'utf8')
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    const value = line
      .slice(idx + 1)
      .trim()
      .replace(/^(['"])(.*)\1$/, '$2')
    if (key && process.env[key] === undefined) process.env[key] = value
  }
}
loadEnv()

const DEV_JWT_SECRET = 'shuyi-dev-secret-change-me'

export const config = {
  port: Number(process.env.PORT) || 3000,
  jwtSecret: process.env.JWT_SECRET || DEV_JWT_SECRET,
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD ?? 'root',
    database: process.env.DB_NAME || 'shuyi',
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    connectTimeout: 5000,
  },
  // 用户上架的书是否需要管理员审核后才出现在「在售」；设 BOOK_REVIEW=0 可关闭
  bookReview: (process.env.BOOK_REVIEW ?? '1') !== '0',
  // 允许跨域访问后端的前端地址，逗号分隔
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
}

if (process.env.NODE_ENV === 'production' && config.jwtSecret === DEV_JWT_SECRET) {
  console.error('[启动失败] 生产环境必须通过环境变量 JWT_SECRET 设置密钥')
  process.exit(1)
}
if (config.jwtSecret === DEV_JWT_SECRET) {
  console.warn('[提示] 正在使用开发用 JWT 密钥，部署前请设置 JWT_SECRET')
}
