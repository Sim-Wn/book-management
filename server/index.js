import { config } from './config.js'
import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import bookRoutes from './routes/books.js'
import orderRoutes from './routes/orders.js'
import uploadRoutes from './routes/upload.js'
import categoryRoutes from './routes/categories.js'
import swapRoutes from './routes/swaps.js'
import messageRoutes from './routes/messages.js'
import forumRoutes from './routes/forum.js'
import statsRoutes from './routes/stats.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadsDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

const app = express()

// 只允许白名单内的前端跨域访问；没有 Origin 的请求（curl、同源、服务端调用）放行
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || config.corsOrigins.includes(origin)) return callback(null, true)
      return callback(null, false)
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)

// 基础安全响应头（不引入额外依赖）
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  next()
})

app.use(express.json({ limit: '1mb' }))

app.use('/uploads', express.static(uploadsDir, { maxAge: '7d' }))
app.use('/api/auth', authRoutes)
app.use('/api/books', bookRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/swaps', swapRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/forum', forumRoutes)
app.use('/api/stats', statsRoutes)

app.get('/api/health', (req, res) => res.json({ ok: true }))

app.use('/api', (req, res) => res.status(404).json({ ok: false, msg: '接口不存在' }))

app.use((err, req, res, _next) => {
  console.error('未处理异常:', err)
  res.status(500).json({ ok: false, msg: '服务器内部错误' })
})

app.listen(config.port, () => {
  console.log(`书易后端运行在 http://localhost:${config.port}`)
  console.log(`数据库: ${config.db.user}@${config.db.host}:${config.db.port}/${config.db.database}`)
})
