<template>
  <div class="page">
    <NavHeader />
    <div class="wrap">
      <h2 class="title">✉️ 我的私信</h2>
      <el-card shadow="never" class="card" v-if="conversations.length">
        <div v-for="c in conversations" :key="c.peer_id" :class="['conv-item', { 'has-unread': c.unread_count }]" @click="$router.push('/messages/'+c.peer_id)">
          <div class="conv-avatar">{{ c.peer_name ? c.peer_name[0] : '?' }}</div>
          <div class="conv-main">
            <div class="conv-top">
              <span class="conv-name">{{ c.peer_name }}</span>
              <span class="conv-time">{{ formatTime(c.last_time) }}</span>
            </div>
            <div class="conv-bot">
              <span class="conv-count">{{ c.msg_count }} 条消息<template v-if="c.unread_count"> · {{ c.unread_count }} 条未读</template></span>
              <el-icon size="12" class="conv-arrow"><ArrowRight /></el-icon>
            </div>
          </div>
        </div>
      </el-card>
      <el-card shadow="never" class="card" v-else-if="!loading">
        <div class="empty">
          <div class="empty-icon">📭</div>
          <p>暂无私信，去图书详情页给卖家发消息吧</p>
          <el-button type="primary" @click="$router.push('/books')">浏览图书</el-button>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/api'
import NavHeader from '@/components/NavHeader.vue'
const auth = useAuthStore()
const conversations = ref([])
const loading = ref(true)

onMounted(async () => {
  if (!auth.isLoggedIn || !auth.user?.id) { loading.value = false; return }
  try {
    const data = await api.getConversations(auth.user.id)
    conversations.value = Array.isArray(data) ? data : []
  } catch {}
  loading.value = false
})

function formatTime(t) {
  if (!t) return ''
  const d = new Date(t)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
  return d.toLocaleDateString('zh-CN')
}
</script>

<style scoped>
.page { min-height: 100vh; background: #f8fafc; }
.wrap { max-width: 700px; margin: 0 auto; padding: 20px; }
.title { margin-bottom: 18px; font-size: 22px; color: #1e293b; font-weight: 700; }
.card { border-radius: 14px; border: 1px solid #e2e8f0; min-height: 200px; box-shadow: 0 1px 4px rgba(0,0,0,0.03); }
.conv-item { display: flex; align-items: center; gap: 14px; padding: 16px 18px; border-bottom: 1px solid #f1f5f9; cursor: pointer; transition: all 0.2s; }
.conv-item:last-child { border-bottom: none; }
.conv-item:hover { background: #fdf8f2; padding-left: 22px; }
.conv-item.has-unread { background: #fef9f0; }
.conv-item.has-unread .conv-name { font-weight: 700; color: #8b6040; }
.conv-avatar { width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, #8b6040, #c09868); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; flex-shrink: 0; box-shadow: 0 2px 8px rgba(139,96,64,0.3); }
.conv-main { flex: 1; min-width: 0; }
.conv-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.conv-name { font-weight: 600; color: #1e293b; font-size: 15px; }
.conv-time { font-size: 12px; color: #94a3b8; }
.conv-bot { display: flex; justify-content: space-between; align-items: center; }
.conv-count { font-size: 12px; color: #64748b; background: #f1f5f9; padding: 2px 10px; border-radius: 10px; }
.conv-arrow { color: #cbd5e1; }
.empty { text-align: center; padding: 50px 20px; }
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty p { color: #94a3b8; margin-bottom: 18px; font-size: 14px; }
</style>
