<template>
  <div class="page">
    <NavHeader />
    <div class="banner">
      <div class="banner-inner">
        <h1>🗄️ 图书档案</h1>
        <p>已下架 / 已交换 / 已售罄的图书 · 共 <strong>{{ list.length }}</strong> 本</p>
      </div>
    </div>
    <div class="wrap">
      <div class="filters">
        <div class="cat-chips">
          <span :class="['chip', {on:!reason}]" @click="reason=''">全部</span>
          <span :class="['chip', {on:reason==='已下架'}]" @click="reason=reason==='已下架'?'':'已下架'">🔒 已下架</span>
          <span :class="['chip', {on:reason==='已交换'}]" @click="reason=reason==='已交换'?'':'已交换'">🔄 已交换</span>
          <span :class="['chip', {on:reason==='已售罄'}]" @click="reason=reason==='已售罄'?'':'已售罄'">💔 已售罄</span>
        </div>
        <el-select v-model="cat" placeholder="全部分类" size="small" clearable style="width:140px">
          <el-option label="全部分类" value=""/>
          <el-option v-for="c in bookStore.categories" :key="c" :label="c" :value="c"/>
        </el-select>
      </div>
      <div v-if="loading" style="text-align:center;padding:60px">
        <el-icon class="spinner" size="32"><Loading /></el-icon>
      </div>
      <div v-else-if="list.length">
        <el-row :gutter="16">
          <el-col v-for="b in list" :key="b.id" :xs="12" :sm="8" :md="6" :lg="4" style="margin-bottom:16px">
            <BookCard :book="b"/>
          </el-col>
        </el-row>
      </div>
      <el-empty v-else description="暂无档案图书" :image-size="100" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useBookStore } from '@/stores/book'
import NavHeader from '@/components/NavHeader.vue'
import BookCard from '@/components/BookCard.vue'

const bookStore = useBookStore()
const cat = ref(''); const reason = ref(''); const loading = ref(true)

const list = computed(() => {
  let books = bookStore.books.filter(b => b.status !== '在售' && b.status !== '待审核' && b.status !== '已驳回')
  if (reason.value) books = books.filter(b => b.status === reason.value)
  if (cat.value) books = books.filter(b => b.category === cat.value)
  return books.sort((a, b) => b.id - a.id)
})

onMounted(async () => {
  loading.value = true
  await bookStore.fetchBooks()
  await bookStore.fetchCategories()
  loading.value = false
})
</script>

<style scoped>
.page { min-height: 100vh; background: #faf8f4; }
.banner {
  background: linear-gradient(160deg, #2a1f16 0%, #46362a 60%, #5c4a3a 100%);
  padding: 32px 20px; text-align: center; color: #fff;
}
.banner-inner { max-width: 1300px; margin: 0 auto; }
.banner h1 { margin: 0 0 8px; font-size: 28px; font-weight: 800; letter-spacing: 2px; }
.banner p { margin: 0; font-size: 14px; color: rgba(255,255,255,0.5); }
.banner strong { color: #c09868; }
.wrap { max-width: 1300px; margin: 0 auto; padding: 20px; }
.filters {
  display: flex; align-items: flex-start; gap: 14px; margin-bottom: 22px;
  background: #fff; padding: 18px 20px; border-radius: 14px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04); border: 1px solid #e8ddd0; flex-wrap: wrap;
}
.cat-chips { display: flex; gap: 8px; flex-wrap: wrap; flex: 1; align-items: center; }
.chip {
  padding: 6px 16px; border-radius: 20px; cursor: pointer; font-size: 13px;
  color: #6b5c4c; background: #f5f0e8; transition: all 0.2s; user-select: none; font-weight: 500;
}
.chip:hover { background: #e8ddd0; color: #3a2518; }
.chip.on { background: #8b6040; color: #fff; font-weight: 600; }
.spinner { animation: spin 1s linear infinite; color: #8b6040; }
@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
</style>
