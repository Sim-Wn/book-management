import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/api'

export const useOrderStore = defineStore('order', () => {
  const orders = ref([])
  const statusFlow = ['待付款', '待发货', '已发货', '已签收', '已完成']

  async function fetchOrders(userId, role) {
    try {
      const data = await api.getOrders(userId, role)
      if (Array.isArray(data)) orders.value = data
    } catch {}
  }

  async function createOrder(data) {
    try {
      const res = await api.createOrder(data)
      if (res.ok) await fetchOrders(data.user_id)
      return res
    } catch { return { ok: false } }
  }

  async function updateStatus(id, status, userId) {
    try { await api.updateOrderStatus(id, status); await fetchOrders(userId) } catch {}
  }

  async function payOrder(id, userId) {
    try {
      const res = await api.payOrder(id)
      if (res.ok) await fetchOrders(userId)
      return res
    } catch { return { ok: false } }
  }

  async function cancelOrder(id, userId) {
    try {
      const res = await api.cancelOrder(id)
      if (res.ok) await fetchOrders(userId)
      return res
    } catch { return { ok: false } }
  }

  async function receiveOrder(id, userId) {
    try {
      const res = await api.receiveOrder(id)
      if (res.ok) await fetchOrders(userId)
      return res
    } catch { return { ok: false } }
  }

  async function refundOrder(id, userId) {
    try {
      const res = await api.refundOrder(id)
      if (res.ok) await fetchOrders(userId)
      return res
    } catch { return { ok: false } }
  }

  return { orders, statusFlow, fetchOrders, createOrder, updateStatus, payOrder, cancelOrder, receiveOrder, refundOrder }
})
