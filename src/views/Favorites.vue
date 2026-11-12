<template>
  <div class="page"><NavHeader /><div class="wrap"><h2>我的收藏</h2><div v-if="loading" style="text-align:center;padding:40px"><el-icon class="loading-spin" size="32"><Loading /></el-icon></div>
      <el-row :gutter="14" v-else-if="fav.length"><el-col v-for="b in fav" :key="b.id" :xs="12" :sm="8" :md="6" :lg="4" style="margin-bottom:14px"><BookCard :book="b"/></el-col></el-row><el-empty v-else description="还没有收藏图书"><el-button type="primary" @click="$router.push('/books')">去逛逛</el-button></el-empty></div></div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useBookStore } from '@/stores/book'
import { useAuthStore } from '@/stores/auth'
import NavHeader from '@/components/NavHeader.vue'
import BookCard from '@/components/BookCard.vue'
const bookStore = useBookStore(); const auth = useAuthStore(); const loading = ref(true)
const fav = computed(()=> bookStore.books.filter(b=>auth.favorites.includes(b.id)))
onMounted(async ()=>{ loading.value=true; await bookStore.fetchBooks(); await auth.loadFavorites(); loading.value=false })
</script>

<style scoped>
.page { min-height: 100vh; background: var(--bg); }
.wrap { max-width: 1300px; margin: 0 auto; padding: 20px; }
.wrap h2 { font-size: 20px; color: var(--text); margin: 0 0 18px; }
.loading-spin { animation: spin 1s linear infinite; color: var(--primary); }
@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
</style>
