import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(JSON.parse(localStorage.getItem('shuyi_user') || 'null'))
  const isAdmin = ref(localStorage.getItem('shuyi_admin') === 'true')
  const favorites = ref([])
  const token = ref(localStorage.getItem('shuyi_token') || '')
  const unreadMessageCount = ref(0)

  const isLoggedIn = computed(() => !!user.value)
  const userName = computed(() => user.value?.username || '')

  async function login(username, password) {
    try {
      const res = await api.login({ username, password })
      if (!res.ok) return { success: false, msg: res.msg || '登录失败' }
      if (res.role === 'admin') {
        user.value = res.user
        isAdmin.value = true
        localStorage.setItem('shuyi_user', JSON.stringify(res.user))
        localStorage.setItem('shuyi_admin', 'true')
      } else {
        user.value = res.user
        isAdmin.value = false
        localStorage.setItem('shuyi_user', JSON.stringify(res.user))
        localStorage.removeItem('shuyi_admin')
      }
      token.value = res.token
      localStorage.setItem('shuyi_token', res.token)
      return { success: true, role: res.role }
    } catch (e) {
      return { success: false, msg: e.message || '登录失败' }
    }
  }

  async function register(form) {
    try {
      const res = await api.register(form)
      return res
    } catch (e) {
      return { ok: false, msg: e.message || '注册失败' }
    }
  }

  async function updateProfile(data) {
    data.userId = user.value?.id
    try { await api.updateProfile(data); if (user.value) { Object.assign(user.value, data); localStorage.setItem('shuyi_user', JSON.stringify(user.value)) } } catch {}
  }

  function logout() {
    user.value = null; isAdmin.value = false; token.value = ''; favorites.value = []
    localStorage.removeItem('shuyi_user'); localStorage.removeItem('shuyi_admin'); localStorage.removeItem('shuyi_token')
  }

  async function loadFavorites() {
    if (!user.value) return
    try { const data = await api.getFavorites(user.value.id); if (Array.isArray(data)) favorites.value = data } catch {}
  }

  async function toggleFavorite(bookId) {
    const idx = favorites.value.indexOf(bookId)
    const add = idx === -1
    if (user.value) {
      try { await api.toggleFavorite(user.value.id, bookId, add) } catch {}
    }
    if (add) favorites.value.push(bookId)
    else favorites.value.splice(idx, 1)
    return add
  }

  function isFavorite(bookId) { return favorites.value.includes(bookId) }

  async function getAllUsers() {
    try { const data = await api.getUsers(); return Array.isArray(data) ? data : [] } catch { return [] }
  }

  async function toggleUserStatus(id) { try { return await api.toggleUser(id) } catch (e) { return { ok: false, msg: e.message } } }
  async function deleteUser(id) { try { return await api.deleteUser(id) } catch (e) { return { ok: false, msg: e.message } } }

  async function fetchUnreadCount() {
    if (!user.value) { unreadMessageCount.value = 0; return }
    try {
      const convs = await api.getConversations(user.value.id)
      if (Array.isArray(convs)) {
        unreadMessageCount.value = convs.reduce((sum, c) => sum + (c.unread_count || 0), 0)
      }
    } catch { unreadMessageCount.value = 0 }
  }

  return { user, isAdmin, isLoggedIn, userName, token, favorites, unreadMessageCount, login, register, updateProfile, logout, loadFavorites, toggleFavorite, isFavorite, getAllUsers, toggleUserStatus, deleteUser, fetchUnreadCount }
})
