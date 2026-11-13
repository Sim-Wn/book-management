<template>
  <div class="page">
    <NavHeader />
    <div class="wrap">
      <div class="top-bar">
        <h2>💬 论坛</h2>
        <div class="acts">
          <el-input
            v-model="keyword"
            placeholder="搜索帖子..."
            size="small"
            clearable
            style="width:200px"
            @keyup.enter="loadPosts"
            @clear="loadPosts"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <el-button type="primary" @click="$router.push('/forum/new')"><el-icon><Plus /></el-icon>发帖</el-button>
        </div>
      </div>
      <el-card shadow="never" class="card" v-if="posts.length && !loading">
        <div v-for="p in posts" :key="p.id" class="post-item" @click="$router.push('/forum/'+p.id)">
          <div class="post-main">
            <span class="post-pin" v-if="p.is_pinned">📌</span>
            <h3 class="post-title">{{ p.title }}</h3>
            <p class="post-preview">{{ (p.content||'').slice(0, 100) }}{{ (p.content||'').length>100?'...':'' }}</p>
          </div>
          <div class="post-meta">
            <span>{{ p.user_name }}</span>
            <span>{{ formatDateTime(p.created_at) }}</span>
            <span>👁 {{ p.view_count || 0 }}</span>
            <span>💬 {{ p.reply_count || 0 }}</span>
          </div>
        </div>
      </el-card>
      <div v-if="loading" style="text-align:center;padding:40px"><el-icon class="spinner" size="28"><Loading /></el-icon></div>
      <el-empty v-else-if="!posts.length" :image-size="80" :description="keyword ? '没有找到相关帖子' : '暂无帖子，来发第一帖吧'"/>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from '@/api'
import NavHeader from '@/components/NavHeader.vue'
import { formatDateTime } from '@/utils/format'

const posts = ref([])
const loading = ref(true)
const keyword = ref('')

async function loadPosts() {
  loading.value = true
  try {
    const data = await api.getPosts({ keyword: keyword.value.trim() })
    if (Array.isArray(data)) posts.value = data
  } catch {}
  loading.value = false
}

onMounted(loadPosts)
</script>

<style scoped>
.page { min-height: 100vh; background: var(--bg); }
.wrap { max-width: 900px; margin: 0 auto; padding: 20px; }
.top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; gap: 12px; }
.top-bar h2 { margin: 0; font-size: 22px; color: var(--text); font-weight: 700; }
.acts { display: flex; align-items: center; gap: 10px; }
.card { border-radius: 12px; border: 1px solid #f0ebe0; }
.post-item { padding: 18px 20px; border-bottom: 1px solid #f5f0e8; cursor: pointer; transition: all 0.2s; }
.post-item:last-child { border-bottom: none; }
.post-item:hover { background: linear-gradient(90deg, #fdfbf7, #fff); padding-left: 24px; }
.post-main { margin-bottom: 10px; }
.post-pin { margin-right: 4px; }
.post-title { margin: 0 0 6px; font-size: 17px; color: var(--text); font-weight: 600; display: inline; }
.post-title:hover { color: var(--primary); }
.post-preview { margin: 0; font-size: 13px; color: var(--text-muted); line-height: 1.7; }
.post-meta { display: flex; gap: 20px; font-size: 12px; color: var(--text-muted); }
.post-meta span { display: flex; align-items: center; gap: 3px; }
.spinner { animation: spin 1s linear infinite; color: var(--primary); }
@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
</style>
