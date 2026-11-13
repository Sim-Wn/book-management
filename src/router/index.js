import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AdminLayout from '@/admin/Layout.vue'

const routes = [
  { path: '/', component: () => import('@/views/Portal.vue') },
  { path: '/login', component: () => import('@/views/Login.vue') },
  { path: '/register', component: () => import('@/views/Register.vue') },
  { path: '/home', component: () => import('@/views/Home.vue') },
  { path: '/books', component: () => import('@/views/Books.vue') },
  { path: '/books/:id', component: () => import('@/views/BookDetail.vue') },
  { path: '/sell', component: () => import('@/views/Sell.vue') },
  { path: '/my-books', component: () => import('@/views/MyBooks.vue') },
  { path: '/favorites', component: () => import('@/views/Favorites.vue') },
  { path: '/cart', component: () => import('@/views/Cart.vue') },
  { path: '/orders', component: () => import('@/views/Orders.vue') },
  { path: '/profile', component: () => import('@/views/Profile.vue') },
  { path: '/swaps', component: () => import('@/views/Swaps.vue') },
  { path: '/chat', component: () => import('@/views/Chat.vue') },
  { path: '/forum', component: () => import('@/views/Forum.vue') },
  { path: '/archive', component: () => import('@/views/Archive.vue') },
  { path: '/forum/new', component: () => import('@/views/ForumNew.vue') },
  { path: '/forum/:id', component: () => import('@/views/ForumPost.vue') },
  { path: '/messages', component: () => import('@/views/Messages.vue') },
  { path: '/messages/:id', component: () => import('@/views/Conversation.vue') },

  { path: '/admin/login', component: () => import('@/admin/Login.vue') },
  {
    path: '/admin', component: AdminLayout, redirect: '/admin/dashboard', meta: { adminAuth: true },
    children: [
      { path: 'dashboard', component: () => import('@/admin/Dashboard.vue') },
      { path: 'books', component: () => import('@/admin/Books.vue') },
      { path: 'orders', component: () => import('@/admin/Orders.vue') },
      { path: 'users', component: () => import('@/admin/Users.vue') },
      { path: 'categories', component: () => import('@/admin/Categories.vue') },
      { path: 'messages', component: () => import('@/admin/Messages.vue') },
      { path: 'swaps', component: () => import('@/admin/Swaps.vue') },
      { path: 'sales', component: () => import('@/admin/Sales.vue') },
    ],
  },

  { path: '/:pathMatch(.*)*', component: () => import('@/views/NotFound.vue') },
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to) => {
  if (to.path === '/admin/login') return true
  if (to.path.startsWith('/admin')) {
    const auth = useAuthStore()
    // 真正的权限校验在服务端；这里只负责把没有 token 的访客挡在后台页面之外
    if (!auth.token || !auth.isAdmin) return '/admin/login'
  }
  return true
})

export default router
