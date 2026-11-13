import fs from 'node:fs'
import path from 'node:path'
import app, { distDir } from './app.js'
import { config } from './config.js'

app.listen(config.port, () => {
  console.log(`书易后端运行在 http://localhost:${config.port}`)
  console.log(`数据库: ${config.db.user}@${config.db.host}:${config.db.port}/${config.db.database}`)
  if (fs.existsSync(path.join(distDir, 'index.html'))) {
    console.log(`前端: 已托管 dist 构建产物，直接打开 http://localhost:${config.port}`)
  } else {
    console.log('前端: 未找到 dist，开发模式请另开终端执行 npm run dev')
  }
})
