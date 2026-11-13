<template>
  <div class="page">
    <NavHeader />
    <div class="banner">
      <div class="banner-inner">
        <h1>📚 全部图书</h1>
        <p>发现你的下一本好书 · 共 <strong>{{ list.length }}</strong> 本在售</p>
      </div>
    </div>
    <div class="wrap">
      <div class="filters">
        <div class="cat-chips">
          <span :class="['chip', {on:!cat}]" @click="cat=''">全部</span>
          <span v-for="c in bookStore.categories.slice(0,8)" :key="c" :class="['chip', {on:cat===c}]" @click="cat=c">{{ c }}</span>
          <el-select v-if="bookStore.categories.length>8" v-model="cat" placeholder="更多分类" size="small" clearable style="width:120px">
            <el-option v-for="c in bookStore.categories" :key="c" :label="c" :value="c"/>
          </el-select>
        </div>
        <el-select v-model="sort" size="small" style="width:130px">
          <el-option label="默认排序" value="default"/>
          <el-option label="价格 ↑" value="price-asc"/>
          <el-option label="价格 ↓" value="price-desc"/>
          <el-option label="🔥 销量优先" value="sales"/>
          <el-option label="🆕 最新上架" value="new"/>
        </el-select>
      </div>
      <div v-if="loading" class="sk-grid">
        <div v-for="i in 12" :key="i" class="sk-card">
          <el-skeleton animated>
            <template #template>
              <el-skeleton-item variant="image" style="width:100%;height:180px;border-radius:12px 12px 0 0" />
              <div style="padding:14px 12px">
                <el-skeleton-item variant="h4" style="width:75%" />
                <el-skeleton-item variant="text" style="width:45%;margin-top:10px" />
              </div>
            </template>
          </el-skeleton>
        </div>
      </div>
      <div v-else-if="list.length">
        <el-row :gutter="16">
          <el-col v-for="b in paged" :key="b.id" :xs="12" :sm="8" :md="6" :lg="4" style="margin-bottom:16px">
            <BookCard :book="b"/>
          </el-col>
        </el-row>
        <div class="pager" v-if="list.length > pageSize">
          <el-pagination
            background
            layout="prev, pager, next, total"
            :total="list.length"
            :page-size="pageSize"
            v-model:current-page="page"
          />
        </div>
      </div>
      <el-empty v-else description="未找到相关图书" :image-size="100">
        <el-button type="primary" @click="cat='';loadBooks()">查看全部</el-button>
      </el-empty>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useBookStore } from '@/stores/book'
import NavHeader from '@/components/NavHeader.vue'
import BookCard from '@/components/BookCard.vue'

const route = useRoute()
const bookStore = useBookStore()
const cat = ref('')
const sort = ref('default')
const loading = ref(true)

const list = computed(() => bookStore.books.filter(b => b.status === '在售'))
const page = ref(1)
const pageSize = 24
const paged = computed(() => list.value.slice((page.value - 1) * pageSize, page.value * pageSize))

async function loadBooks() {
  loading.value = true
  page.value = 1
  const params = {}
  if (cat.value) params.category = cat.value
  if (route.query.q) params.keyword = route.query.q
  if (sort.value && sort.value !== 'default') params.sort = sort.value
  await bookStore.fetchBooks(params)
  loading.value = false
}

watch(() => route.query.q, (v) => {
  if (v) cat.value = ''
  loadBooks()
})

watch([cat, sort], () => {
  if (cat.value) {
    const q = { ...route.query, cat: cat.value }
    delete q.q
    history.replaceState(null, '', '/books?' + new URLSearchParams(q).toString())
  }
  loadBooks()
})

onMounted(async () => {
  cat.value = route.query.cat || ''
  await bookStore.fetchCategories()
  await loadBooks()
})
</script>

<style scoped>
.page { min-height: 100vh; background: #faf8f4; }

/* Banner */
.banner {
  background: linear-gradient(160deg, #3a2518 0%, #5c3c28 60%, #7a5840 100%);
  padding: 32px 20px; text-align: center; color: #fff;
}
.banner-inner { max-width: 1300px; margin: 0 auto; }
.banner h1 { margin: 0 0 8px; font-size: 28px; font-weight: 800; letter-spacing: 2px; }
.banner p { margin: 0; font-size: 14px; color: rgba(255,255,255,0.5); }
.banner strong { color: #d4a060; }

.wrap { max-width: 1300px; margin: 0 auto; padding: 20px; }

/* Filters */
.filters {
  display: flex; align-items: flex-start; gap: 14px; margin-bottom: 22px;
  background: #fff; padding: 18px 20px; border-radius: 14px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04); border: 1px solid #e8ddd0;
  flex-wrap: wrap;
}
.cat-chips { display: flex; gap: 8px; flex-wrap: wrap; flex: 1; align-items: center; }
.chip {
  padding: 6px 16px; border-radius: 20px; cursor: pointer; font-size: 13px;
  color: #6b5c4c; background: #f5f0e8; transition: all 0.2s; user-select: none; font-weight: 500;
}
.chip:hover { background: #e8ddd0; color: #3a2518; }
.chip.on { background: #8b6040; color: #fff; font-weight: 600; }

.spinner { animation: spin 1s linear infinite; color: #8b6040; }
.pager { display: flex; justify-content: center; padding: 8px 0 24px; }
.sk-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 16px; }
.sk-card { background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #f0ebe0; }
@media (max-width: 1200px) { .sk-grid { grid-template-columns: repeat(4, 1fr); } }
@media (max-width: 768px) {
  .sk-grid { grid-template-columns: repeat(2, 1fr); }
  .banner { padding: 24px 14px; }
  .banner h1 { font-size: 22px; }
  .filters { padding: 14px; gap: 10px; }
  .wrap { padding: 14px; }
}
@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
</style>
