import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'

// 必须在导入 app 之前指定测试库，避免碰到真实数据
process.env.DB_NAME = 'shuyi_test'
process.env.JWT_SECRET = 'vitest-secret'

const { default: app } = await import('../app.js')

const username = 'vitest_' + Date.now().toString().slice(-6)
const password = 'vitest123456'
let adminToken = ''
let userId = null

beforeAll(async () => {
  const res = await request(app).post('/api/auth/login').send({ username: 'admin', password: '123456' })
  adminToken = res.body.token || ''
})

afterAll(async () => {
  if (adminToken && userId) {
    await request(app).delete(`/api/auth/users/${userId}`).set('Authorization', `Bearer ${adminToken}`)
  }
})

describe('公开接口', () => {
  it('健康检查返回 ok', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('统计接口返回数字', async () => {
    const res = await request(app).get('/api/stats')
    expect(res.body.booksOnSale).toBeTypeOf('number')
    expect(res.body.categories).toBeGreaterThan(0)
  })

  it('图书分页返回 items / total', async () => {
    const res = await request(app).get('/api/books?status=%E5%9C%A8%E5%94%AE&page=1&pageSize=5')
    expect(Array.isArray(res.body.items)).toBe(true)
    expect(res.body.items.length).toBeLessThanOrEqual(5)
    expect(res.body.total).toBeGreaterThanOrEqual(res.body.items.length)
  })

  it('不存在的图书返回 404', async () => {
    const res = await request(app).get('/api/books/999999')
    expect(res.status).toBe(404)
  })

  it('不存在的接口返回 JSON 404', async () => {
    const res = await request(app).get('/api/not-exists')
    expect(res.status).toBe(404)
    expect(res.body.ok).toBe(false)
  })

  it('论坛分页返回 items / total', async () => {
    const res = await request(app).get('/api/forum/posts?page=1&pageSize=3')
    expect(Array.isArray(res.body.items)).toBe(true)
    expect(res.body.total).toBeGreaterThanOrEqual(0)
  })
})

describe('鉴权', () => {
  it('未登录访问用户列表返回 401', async () => {
    const res = await request(app).get('/api/auth/users')
    expect(res.status).toBe(401)
  })

  it('伪造 token 返回 401', async () => {
    const res = await request(app).get('/api/auth/users').set('Authorization', 'Bearer fake.token.value')
    expect(res.status).toBe(401)
  })

  it('密码错误时不会登录成功', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'wrong-password' })
    expect(res.body.ok).toBe(false)
  })

  it('管理员可以读取用户列表', async () => {
    const res = await request(app).get('/api/auth/users').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })
})

describe('用户流程', () => {
  it('注册、登录、校验原密码后修改密码', async () => {
    const reg = await request(app).post('/api/auth/register').send({ username, password })
    expect(reg.body.ok).toBe(true)

    const login = await request(app).post('/api/auth/login').send({ username, password })
    expect(login.body.ok).toBe(true)
    userId = login.body.user.id
    const token = login.body.token

    const bad = await request(app)
      .put('/api/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ oldPassword: 'not-the-password', newPassword: 'newpass123' })
    expect(bad.body.ok).toBe(false)

    const good = await request(app)
      .put('/api/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ oldPassword: password, newPassword: 'newpass123' })
    expect(good.body.ok).toBe(true)

    const relogin = await request(app).post('/api/auth/login').send({ username, password: 'newpass123' })
    expect(relogin.body.ok).toBe(true)
  })
})
