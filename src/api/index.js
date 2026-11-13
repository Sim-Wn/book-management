const BASE = '/api'

function clearSession() {
  localStorage.removeItem('shuyi_user')
  localStorage.removeItem('shuyi_admin')
  localStorage.removeItem('shuyi_token')
}

async function request(url, options = {}) {
  const token = localStorage.getItem('shuyi_token')
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token) headers['Authorization'] = 'Bearer ' + token

  let res
  try {
    res = await fetch(BASE + url, { ...options, headers })
  } catch {
    throw new Error('网络异常，请检查后端是否已启动')
  }

  let data = null
  try {
    data = await res.json()
  } catch {}

  if (res.status === 401) {
    clearSession()
    const loginPath = location.pathname.startsWith('/admin') ? '/admin/login' : '/login'
    if (location.pathname !== loginPath) location.assign(loginPath)
    throw new Error(data?.msg || '登录已过期，请重新登录')
  }
  if (!res.ok) throw new Error(data?.msg || `请求失败 (${res.status})`)
  return data
}

export const api = {
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request('/auth/me'),
  updateProfile: (data) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
  updatePassword: (data) => request('/auth/password', { method: 'PUT', body: JSON.stringify(data) }),
  getUsers: () => request('/auth/users'),
  toggleUser: (id) => request('/auth/users/' + id + '/toggle', { method: 'PUT' }),
  deleteUser: (id) => request('/auth/users/' + id, { method: 'DELETE' }),

  getStats: () => request('/stats'),

  getBooks: (params = {}) => {
    const clean = {}
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') clean[k] = v
    }
    const qs = new URLSearchParams(clean).toString()
    return request('/books' + (qs ? '?' + qs : ''))
  },
  getCategories: () => request('/books/categories'),
  getBook: (id) => request('/books/' + id),
  addBook: (data) => request('/books', { method: 'POST', body: JSON.stringify(data) }),
  updateBook: (id, data) => request('/books/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBook: (id) => request('/books/' + id, { method: 'DELETE' }),
  getFavorites: (userId) => request('/books/' + userId + '/favorites'),
  toggleFavorite: (userId, bookId, add) => request('/books/' + userId + '/favorite', { method: 'POST', body: JSON.stringify({ bookId, add }) }),
  getRating: (bookId, userId) => request('/books/' + bookId + '/rating' + (userId ? '?user_id=' + userId : '')),
  getReviews: (bookId) => request('/books/' + bookId + '/reviews'),
  rateBook: (bookId, data) => request('/books/' + bookId + '/rate', { method: 'POST', body: JSON.stringify(data) }),

  createOrder: (data) => request('/orders', { method: 'POST', body: JSON.stringify(data) }),
  getOrders: (userId, role) => {
    const qs = new URLSearchParams()
    if (userId) qs.set('user_id', userId)
    if (role) qs.set('role', role)
    const s = qs.toString()
    return request('/orders' + (s ? '?' + s : ''))
  },
  getOrder: (id) => request('/orders/' + id),
  updateOrderStatus: (id, status) => request('/orders/' + id + '/status', { method: 'PUT', body: JSON.stringify({ status }) }),
  payOrder: (id) => request('/orders/' + id + '/pay', { method: 'POST' }),
  cancelOrder: (id) => request('/orders/' + id + '/cancel', { method: 'POST' }),
  receiveOrder: (id) => request('/orders/' + id + '/receive', { method: 'POST' }),
  refundOrder: (id) => request('/orders/' + id + '/refund', { method: 'POST' }),

  // === Categories ===
  getCategoryList: () => request('/categories'),
  createCategory: (data) => request('/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id, data) => request('/categories/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id) => request('/categories/' + id, { method: 'DELETE' }),

  // === Swaps ===
  createSwap: (data) => request('/swaps', { method: 'POST', body: JSON.stringify(data) }),
  getSwaps: (userId) => request('/swaps' + (userId ? '?user_id=' + userId : '')),
  updateSwapStatus: (id, status) => request('/swaps/' + id + '/status', { method: 'PUT', body: JSON.stringify({ status }) }),
  agreeSwap: (id, userId) => request('/swaps/' + id + '/agree', { method: 'POST', body: JSON.stringify({ user_id: userId }) }),
  rejectSwap: (id, userId) => request('/swaps/' + id + '/reject', { method: 'POST', body: JSON.stringify({ user_id: userId }) }),
  adminGetAllSwaps: () => request('/swaps'),
  adminForceSwapStatus: (id, status) => request('/swaps/' + id + '/admin-force-status', { method: 'PUT', body: JSON.stringify({ status }) }),

  // === Messages ===
  getMessages: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request('/messages' + (qs ? '?' + qs : ''))
  },
  sendMessage: (data) => request('/messages', { method: 'POST', body: JSON.stringify(data) }),
  getConversations: (userId) => request('/messages/conversations?user_id=' + userId),
  getPrivateMessages: (senderId, receiverId) => request('/messages/pm?sender_id=' + senderId + '&receiver_id=' + receiverId),
  markMessagesRead: (receiverId, senderId) => request('/messages/read', { method: 'PUT', body: JSON.stringify({ receiver_id: receiverId, sender_id: senderId }) }),

  // === Forum ===
  getPosts: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request('/forum/posts' + (qs ? '?' + qs : ''))
  },
  getPost: (id) => request('/forum/posts/' + id),
  createPost: (data) => request('/forum/posts', { method: 'POST', body: JSON.stringify(data) }),
  updatePost: (id, data) => request('/forum/posts/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  deletePost: (id) => request('/forum/posts/' + id, { method: 'DELETE' }),
  addReply: (postId, data) => request('/forum/posts/' + postId + '/replies', { method: 'POST', body: JSON.stringify(data) }),
  deleteReply: (id) => request('/forum/replies/' + id, { method: 'DELETE' }),
}
