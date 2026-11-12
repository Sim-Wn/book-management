import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useCartStore = defineStore('cart', () => {
  const items = ref(JSON.parse(localStorage.getItem('shuyi_cart') || '[]'))
  function save() { localStorage.setItem('shuyi_cart', JSON.stringify(items.value)) }
  const totalCount = computed(() => items.value.reduce((s, i) => s + i.quantity, 0))
  const totalPrice = computed(() => items.value.reduce((s, i) => s + i.price * i.quantity, 0))
  function addItem(book) {
    const exist = items.value.find(i => i.id === book.id)
    if (exist) exist.quantity++
    else items.value.push({ ...book, quantity: 1 })
    save()
  }
  function removeItem(id) { items.value = items.value.filter(i => i.id !== id); save() }
  function updateQuantity(id, qty) { const item = items.value.find(i => i.id === id); if (item && qty > 0) { item.quantity = qty; save() } }
  function clear() { items.value = []; save() }
  return { items, totalCount, totalPrice, addItem, removeItem, updateQuantity, clear }
})
