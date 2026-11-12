import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/api'

export const useSwapStore = defineStore('swap', () => {
  const swaps = ref([])

  async function fetchSwaps(userId) {
    try { const data = await api.getSwaps(userId); if (Array.isArray(data)) swaps.value = data } catch {}
  }
  async function createSwap(data) {
    try { const res = await api.createSwap(data); return res } catch (e) { return { ok: false, msg: e.message } }
  }
  async function agreeSwap(id, userId) {
    try { const res = await api.agreeSwap(id, userId); await fetchSwaps(userId); return res } catch (e) { return { ok: false, msg: e.message } }
  }
  async function rejectSwap(id, userId) {
    try { const res = await api.rejectSwap(id, userId); await fetchSwaps(userId); return res } catch (e) { return { ok: false, msg: e.message } }
  }

  return { swaps, fetchSwaps, createSwap, agreeSwap, rejectSwap }
})
