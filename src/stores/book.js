import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/api'

export const useBookStore = defineStore('book', () => {
  const books = ref([])
  const categories = ref([])
  const categoryList = ref([])
  const conditions = ['全新未拆封', '几乎全新', '轻微使用', '正常磨损']
  const icons = ['📗','📘','📙','📕','📓','📔','📒','📚','🐍','🌐','📐','💻','🔧','🎨','📊','🔬','🎭','🏛️','💡','📖']

  async function fetchBooks(params = {}) {
    try {
      const data = await api.getBooks(params)
      if (Array.isArray(data)) books.value = data
    } catch {}
  }

  async function fetchCategories() {
    try {
      const data = await api.getCategories()
      if (Array.isArray(data)) categories.value = data
    } catch {}
  }

  function getBook(id) { return books.value.find(b => b.id === Number(id)) }
  function getUserBooks(username) { return books.value.filter(b => b.seller_name === username) }

  async function addBook(data) {
    try {
      const res = await api.addBook(data)
      if (res.ok) await fetchBooks()
      return res
    } catch { return { ok: false } }
  }

  async function updateBook(id, data) {
    try { await api.updateBook(id, data); await fetchBooks() } catch {}
  }

  async function deleteBook(id) {
    try { await api.deleteBook(id); await fetchBooks() } catch {}
  }

  async function fetchCategoryList() {
    try { const data = await api.getCategoryList(); if (Array.isArray(data)) categoryList.value = data } catch {}
  }
  async function createCategory(data) {
    try { await api.createCategory(data); await fetchCategoryList(); return { ok: true } } catch (e) { return { ok: false, msg: e.message } }
  }
  async function updateCategory(id, data) {
    try { await api.updateCategory(id, data); await fetchCategoryList() } catch {}
  }
  async function deleteCategory(id) {
    try { await api.deleteCategory(id); await fetchCategoryList() } catch {}
  }

  return { books, categories, categoryList, conditions, icons, fetchBooks, fetchCategories, getBook, getUserBooks, addBook, updateBook, deleteBook, fetchCategoryList, createCategory, updateCategory, deleteCategory }
})
