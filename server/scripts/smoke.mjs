/**
 * 接口冒烟测试（自带数据、可重复执行）
 *
 * 用法：
 *   1) 先用测试库初始化：DB_NAME=shuyi_test node init-db.js
 *   2) 启动后端：DB_NAME=shuyi_test PORT=3100 node index.js
 *   3) 运行：SMOKE_BASE=http://localhost:3100 node scripts/smoke.mjs
 *
 * 脚本只会操作自己创建的 smoke_ 前缀账号，不影响真实数据。
 */
const BASE = process.env.SMOKE_BASE || 'http://localhost:3000'
const stamp = Date.now().toString().slice(-6)
const PASSWORD = 'smoke123456'

let passed = 0
let failed = 0
const failures = []

function check(name, cond, extra = '') {
  if (cond) {
    passed++
    console.log(`  ✔ ${name}`)
  } else {
    failed++
    failures.push(name)
    console.log(`  ✘ ${name}${extra ? ' — ' + extra : ''}`)
  }
}

async function call(method, path, { token, body } = {}) {
  const headers = {}
  if (token) headers.Authorization = 'Bearer ' + token
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  let data = null
  try { data = await res.json() } catch {}
  return { status: res.status, data }
}

async function login(username, password = PASSWORD) {
  const r = await call('POST', '/api/auth/login', { body: { username, password } })
  return r.data
}

async function register(username) {
  return call('POST', '/api/auth/register', { body: { username, password: PASSWORD } })
}

async function cleanup(adminToken) {
  if (!adminToken) return
  const { data: users } = await call('GET', '/api/auth/users', { token: adminToken })
  if (!Array.isArray(users)) return
  for (const u of users.filter(u => String(u.username).startsWith('smoke_'))) {
    const { data: books } = await call('GET', `/api/books?seller_name=${encodeURIComponent(u.username)}`)
    for (const b of Array.isArray(books) ? books : []) {
      await call('DELETE', `/api/books/${b.id}`, { token: adminToken })
    }
    await call('DELETE', `/api/auth/users/${u.id}`, { token: adminToken })
  }
}

console.log(`\n冒烟测试目标: ${BASE}\n`)

// ---------- 0. 基础连通性 ----------
const health = await call('GET', '/api/health')
check('健康检查返回 ok', health.status === 200 && health.data?.ok === true)
const stats = await call('GET', '/api/stats')
check('统计接口返回在售数量', stats.status === 200 && Number.isInteger(stats.data?.booksOnSale))

// 分页：带 page 参数时返回 { items, total }
const paged = await call('GET', '/api/books?status=%E5%9C%A8%E5%94%AE&page=1&pageSize=5')
check('图书接口分页返回 items/total', Array.isArray(paged.data?.items) && paged.data.items.length <= 5 && Number(paged.data?.total) >= paged.data.items.length)
const forumPage = await call('GET', '/api/forum/posts?page=1&pageSize=5')
check('论坛接口分页返回 items/total', Array.isArray(forumPage.data?.items) && Number(forumPage.data?.total) >= 0)

// ---------- 1. 未登录访问应被拒绝 ----------
check('未登录读取用户列表 = 401', (await call('GET', '/api/auth/users')).status === 401)
check('未登录下单 = 401', (await call('POST', '/api/orders', { body: { items: [] } })).status === 401)
check('未登录改分类 = 401', (await call('POST', '/api/categories', { body: { name: 'x' } })).status === 401)
check('未登录上传 = 401', (await call('POST', '/api/upload')).status === 401)
check('伪造 token = 401', (await call('GET', '/api/auth/users', { token: 'fake.token.value' })).status === 401)

// ---------- 2. 管理员登录，清理历史测试数据 ----------
const admin = await login('admin', '123456')
check('管理员可登录', admin?.ok === true && admin?.role === 'admin' && !!admin?.token)
const adminToken = admin?.token
await cleanup(adminToken)

// ---------- 3. 注册三个用户 ----------
const names = { a: `smoke_a_${stamp}`, b: `smoke_b_${stamp}`, c: `smoke_c_${stamp}` }
for (const n of Object.values(names)) {
  const r = await register(n)
  check(`注册 ${n}`, r.data?.ok === true, JSON.stringify(r.data))
}
const tok = {}
for (const k of Object.keys(names)) {
  const r = await login(names[k])
  tok[k] = r?.token
  check(`登录 ${names[k]}`, !!tok[k])
}

check('普通用户访问用户列表 = 403', (await call('GET', '/api/auth/users', { token: tok.a })).status === 403)
check('普通用户改分类 = 403', (await call('POST', '/api/categories', { token: tok.a, body: { name: '冒烟分类' } })).status === 403)

// ---------- 4. 发布图书 + 审核流程 ----------
async function publish(who, name, price) {
  const r = await call('POST', '/api/books', {
    token: tok[who],
    body: { name, author: '冒烟作者', category: '计算机技术', price, stock: 3, description: '冒烟测试' },
  })
  return r.data
}

const bookA = await publish('a', `冒烟图书A_${stamp}`, 30)
check('用户发布的书默认待审核', bookA?.ok === true && bookA?.status === '待审核', JSON.stringify(bookA))
const bookB = await publish('b', `冒烟图书B_${stamp}`, 20)
check('用户 B 发布成功', bookB?.ok === true)

const approve = await call('PUT', `/api/books/${bookA.id}`, { token: adminToken, body: { status: '在售' } })
check('管理员审核通过', approve.data?.ok === true)
await call('PUT', `/api/books/${bookB.id}`, { token: adminToken, body: { status: '在售' } })

check('他人不能编辑我的图书 = 403', (await call('PUT', `/api/books/${bookA.id}`, { token: tok.b, body: { price: 1 } })).status === 403)
check('卖家不能自行改状态 = 403', (await call('PUT', `/api/books/${bookA.id}`, { token: tok.a, body: { status: '已完成' } })).status === 403)
check('卖家可自行下架再上架', (await call('PUT', `/api/books/${bookA.id}`, { token: tok.a, body: { status: '已下架' } })).data?.ok === true)
await call('PUT', `/api/books/${bookA.id}`, { token: tok.a, body: { status: '在售' } })

const before = await call('GET', `/api/books/${bookA.id}`)
const stockBefore = before.data?.stock
const salesBefore = before.data?.sales

// ---------- 5. 下单：价格/总价必须由服务端计算 ----------
const buy = await call('POST', '/api/orders', {
  token: tok.b,
  body: {
    address: '测试地址',
    phone: '13800000000',
    total: 0.01,
    items: [{ book_id: bookA.id, quantity: 1, price: 0.01, name: '伪造书名' }],
  },
})
check('下单成功', buy.data?.ok === true, JSON.stringify(buy.data))
check('总价由服务端按数据库价格计算', Number(buy.data?.total) === 30, `got ${buy.data?.total}`)

const after = await call('GET', `/api/books/${bookA.id}`)
check('下单后库存 -1', Number(after.data?.stock) === Number(stockBefore) - 1, `${stockBefore} -> ${after.data?.stock}`)
check('下单后销量不变（完成才计）', Number(after.data?.sales) === Number(salesBefore), `${salesBefore} -> ${after.data?.sales}`)

const orderId = buy.data?.id
check('他人不能取消我的订单 = 403', (await call('POST', `/api/orders/${orderId}/cancel`, { token: tok.a })).status === 403)
check('未登录不能改订单状态 = 401', (await call('PUT', `/api/orders/${orderId}/status`, { body: { status: '已发货' } })).status === 401)
check('买家取消订单', (await call('POST', `/api/orders/${orderId}/cancel`, { token: tok.b })).data?.ok === true)

const restored = await call('GET', `/api/books/${bookA.id}`)
check('取消后库存恢复', Number(restored.data?.stock) === Number(stockBefore), `${stockBefore} -> ${restored.data?.stock}`)

// ---------- 6. 完整成交流程 ----------
const buy2 = await call('POST', '/api/orders', {
  token: tok.b,
  body: { address: '测试地址', phone: '13800000000', items: [{ book_id: bookA.id, quantity: 2 }] },
})
const order2 = buy2.data?.id
check('第二笔订单创建', buy2.data?.ok === true)
check('支付', (await call('POST', `/api/orders/${order2}/pay`, { token: tok.b })).data?.ok === true)
check('卖家/管理员发货', (await call('PUT', `/api/orders/${order2}/status`, { token: adminToken, body: { status: '已发货' } })).data?.ok === true)
check('确认收货', (await call('POST', `/api/orders/${order2}/receive`, { token: tok.b })).data?.ok === true)
check('确认完成', (await call('PUT', `/api/orders/${order2}/status`, { token: tok.b, body: { status: '已完成' } })).data?.ok === true)
const sold = await call('GET', `/api/books/${bookA.id}`)
check('完成后销量 +2', Number(sold.data?.sales) === Number(salesBefore) + 2, `${salesBefore} -> ${sold.data?.sales}`)

// ---------- 6.1 订单详情与卖家视角 ----------
const orderDetail = await call('GET', `/api/orders/${order2}`, { token: tok.b })
check('买家可查看订单详情', orderDetail.status === 200 && Array.isArray(orderDetail.data?.items))
check('无关用户不能看订单详情 = 403', (await call('GET', `/api/orders/${order2}`, { token: tok.c })).status === 403)

const sellerOrders = await call('GET', '/api/orders?role=seller', { token: tok.a })
check('卖家能看到别人买自己书的订单', Array.isArray(sellerOrders.data) && sellerOrders.data.some((o) => String(o.id) === String(order2)))
const buyerOrders = await call('GET', '/api/orders', { token: tok.a })
check('买家视角不含自己卖出的订单', Array.isArray(buyerOrders.data) && !buyerOrders.data.some((o) => String(o.id) === String(order2)))

// ---------- 7. 跨卖家订单应被拒绝 ----------
const mixed = await call('POST', '/api/orders', {
  token: tok.b,
  body: { address: '测试地址', phone: '13800000000', items: [{ book_id: bookA.id, quantity: 1 }, { book_id: bookB.id, quantity: 1 }] },
})
check('跨卖家下单被拒绝', mixed.status === 400, `status=${mixed.status} ${JSON.stringify(mixed.data)}`)

// ---------- 8. 私信与越权 ----------
const pm = await call('POST', '/api/messages', { token: tok.a, body: { receiver_id: 1, content: '冒烟私信' } })
check('发送私信', pm.data?.ok === true)
const conv = await call('GET', `/api/messages/conversations?user_id=1`, { token: tok.c })
check('不能偷看他人会话 = 403', conv.status === 403)
const pmList = await call('GET', '/api/messages/pm?sender_id=1&receiver_id=1', { token: tok.c })
check('不能偷看他人私信 = 403', pmList.status === 403)

// ---------- 9. 论坛 ----------
const post = await call('POST', '/api/forum/posts', { token: tok.a, body: { title: '冒烟帖子', content: '内容' } })
check('发帖', post.data?.ok === true)
const postId = post.data?.id
check('他人不能编辑帖子 = 403', (await call('PUT', `/api/forum/posts/${postId}`, { token: tok.c, body: { title: '改' } })).status === 403)
await call('POST', `/api/forum/posts/${postId}/replies`, { token: tok.b, body: { content: '回复' } })
const detail = await call('GET', `/api/forum/posts/${postId}`)
check('回复数 +1', Number(detail.data?.reply_count) === 1, `got ${detail.data?.reply_count}`)
const replyId = detail.data?.replies?.[0]?.id
check('删除回复', (await call('DELETE', `/api/forum/replies/${replyId}`, { token: tok.b })).data?.ok === true)
const detail2 = await call('GET', `/api/forum/posts/${postId}`)
check('删除后回复数 -1', Number(detail2.data?.reply_count) === 0, `got ${detail2.data?.reply_count}`)

// ---------- 10. 评分与文字评价 ----------
check('评分', (await call('POST', `/api/books/${bookA.id}/rate`, { token: tok.c, body: { score: 5 } })).data?.ok === true)
const rating = await call('GET', `/api/books/${bookA.id}/rating`)
check('评分写入并回填', Number(rating.data?.rating) === 5 && Number(rating.data?.count) >= 1)
check('带文字评价', (await call('POST', `/api/books/${bookA.id}/rate`, { token: tok.c, body: { score: 4, comment: '成色不错，发货也快' } })).data?.ok === true)
const reviews = await call('GET', `/api/books/${bookA.id}/reviews`)
check('评价列表返回文字内容', reviews.data?.list?.some((r) => String(r.comment).includes('成色不错')))

// ---------- 10.5 修改密码 ----------
check('原密码错误时拒绝改密', (await call('PUT', '/api/auth/password', { token: tok.a, body: { oldPassword: 'wrong-pass', newPassword: 'smoke654321' } })).data?.ok === false)
check('修改密码成功', (await call('PUT', '/api/auth/password', { token: tok.a, body: { oldPassword: PASSWORD, newPassword: 'smoke654321' } })).data?.ok === true)
check('新密码可以登录', (await login(names.a, 'smoke654321'))?.ok === true)

// ---------- 11. 交换 ----------
const swapBad = await call('POST', '/api/swaps', {
  token: tok.c,
  body: { from_book_id: bookA.id, from_book_name: 'A', to_user_id: 2, to_book_id: bookB.id, to_book_name: 'B' },
})
check('不能拿别人的书发起交换', swapBad.data?.ok === false)

// ---------- 12. 清理 ----------
await cleanup(adminToken)
const left = await call('GET', '/api/auth/users', { token: adminToken })
check('测试账号已清理', (left.data || []).filter(u => String(u.username).startsWith('smoke_')).length === 0)

console.log(`\n结果: ${passed} 通过, ${failed} 失败`)
if (failed) {
  console.log('失败项: ' + failures.join(' | '))
  process.exit(1)
}
console.log('✅ 冒烟测试全部通过\n')
