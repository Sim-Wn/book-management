import mysql from 'mysql2/promise'
import bcrypt from 'bcryptjs'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { config } from './config.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_NAME = config.db.database

if (!/^[A-Za-z0-9_]+$/.test(DB_NAME)) {
  console.error('❌ 数据库名不合法：' + DB_NAME)
  process.exit(1)
}

async function init() {
  console.log(`正在连接 MySQL (${config.db.user}@${config.db.host}:${config.db.port})...`)
  // 首次初始化时数据库还不存在，连接配置里不能带 database 字段
  const connConfig = { ...config.db }
  delete connConfig.database
  const conn = await mysql.createConnection({
    ...connConfig,
    multipleStatements: true,
  })

  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  await conn.query(`USE \`${DB_NAME}\``)
  console.log(`数据库 ${DB_NAME} 已就绪`)

  await conn.query('SET FOREIGN_KEY_CHECKS=0')
  await conn.query('DROP TABLE IF EXISTS forum_replies, forum_posts, messages, swaps, order_items, favorites, orders, books, ratings, categories, users')
  await conn.query('SET FOREIGN_KEY_CHECKS=1')
  console.log('旧表已清理')

  await conn.query(`CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    passwd VARCHAR(200) NOT NULL,
    email VARCHAR(100) DEFAULT '',
    phone VARCHAR(20) DEFAULT '',
    avatar VARCHAR(500) DEFAULT '',
    address VARCHAR(200) DEFAULT '',
    bio VARCHAR(500) DEFAULT '',
    role VARCHAR(10) DEFAULT 'user',
    disabled TINYINT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)

  await conn.query(`CREATE TABLE books (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    author VARCHAR(100) NOT NULL,
    category VARCHAR(50) DEFAULT '其他',
    price DECIMAL(10,2) NOT NULL,
    original_price DECIMAL(10,2) DEFAULT 0,
    stock INT DEFAULT 1,
    sales INT DEFAULT 0,
    status VARCHAR(10) DEFAULT '在售',
    condition_grade VARCHAR(20) DEFAULT '轻微使用',
    cover VARCHAR(10) DEFAULT '📗',
    cover_url VARCHAR(500) DEFAULT '',
    description TEXT,
    seller_id INT,
    seller_name VARCHAR(50) DEFAULT '系统官方',
    rating DECIMAL(2,1) DEFAULT 0,
    listed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)

  await conn.query(`CREATE TABLE orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_no VARCHAR(20) NOT NULL,
    user_id INT,
    seller_id INT,
    user_name VARCHAR(50),
    total DECIMAL(10,2) NOT NULL,
    status VARCHAR(10) DEFAULT '待付款',
    address VARCHAR(200),
    phone VARCHAR(20),
    remark VARCHAR(200) DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)

  await conn.query(`CREATE TABLE order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    book_id INT,
    book_name VARCHAR(200),
    price DECIMAL(10,2),
    quantity INT DEFAULT 1,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)

  await conn.query(`CREATE TABLE favorites (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    book_id INT NOT NULL,
    UNIQUE KEY uk_user_book (user_id, book_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)

  await conn.query(`CREATE TABLE ratings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    book_id INT NOT NULL,
    score TINYINT NOT NULL,
    comment VARCHAR(500) DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_book (user_id, book_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)

  await conn.query(`CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    icon VARCHAR(10) DEFAULT '📚',
    sort_order INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)

  await conn.query(`CREATE TABLE swaps (
    id INT PRIMARY KEY AUTO_INCREMENT,
    from_user_id INT NOT NULL,
    from_book_id INT NOT NULL,
    from_book_name VARCHAR(200),
    to_user_id INT NOT NULL,
    to_book_id INT NOT NULL,
    to_book_name VARCHAR(200),
    status VARCHAR(10) DEFAULT '待确认',
    from_agreed TINYINT DEFAULT 0,
    to_agreed TINYINT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)

  await conn.query(`CREATE TABLE messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT,
    swap_id INT,
    sender_id INT NOT NULL,
    receiver_id INT,
    sender_name VARCHAR(50),
    sender_role VARCHAR(10) DEFAULT 'user',
    content TEXT NOT NULL,
    is_read TINYINT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)

  await conn.query(`CREATE TABLE forum_posts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    user_name VARCHAR(50),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    view_count INT DEFAULT 0,
    reply_count INT DEFAULT 0,
    is_pinned TINYINT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)

  await conn.query(`CREATE TABLE forum_replies (
    id INT PRIMARY KEY AUTO_INCREMENT,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    user_name VARCHAR(50),
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES forum_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)

  console.log('11 张表已创建')

  const hash = await bcrypt.hash('123456', 10)
  await conn.query("INSERT INTO users (username,passwd,role) VALUES ('admin',?,'admin')", [hash])
  console.log('管理员账号已创建: admin / 123456')

  const categoryNames = [
    '文学小说', '科幻', '外国文学', '儿童文学', '历史社科', '经济管理',
    '推理悬疑', '艺术设计', '自然科学', '国学经典', '心理学', '计算机技术',
    '哲学宗教', '成功励志', '传记', '医学健康', '散文随笔', '诗歌',
    '政治法律', '漫画绘本', '教育', '语言学习', '考试教辅',
  ]
  for (let i = 0; i < categoryNames.length; i++) {
    await conn.query('INSERT INTO categories (name, sort_order) VALUES (?,?)', [categoryNames[i], i])
  }
  console.log(`${categoryNames.length} 个分类已入库`)

  const books = JSON.parse(readFileSync(join(__dirname, 'books.json'), 'utf8'))
  for (const b of books) {
    await conn.query(
      'INSERT INTO books (name,author,category,price,original_price,stock,sales,condition_grade,cover,description,seller_name) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      b
    )
  }
  console.log(`${books.length} 本图书已入库`)

  await conn.end()
  console.log('\n✅ 初始化完成! 后端: npm start  前端: npm run dev')
}

init().catch((e) => {
  console.error('❌ 初始化失败:', e.message)
  console.error(`请确认 MySQL 已启动且账号可登录: ${config.db.user}@${config.db.host}:${config.db.port}`)
  process.exit(1)
})
