<template>
  <div class="page">
    <NavHeader />
    <div class="wrap">
      <div class="chat-card">
        <div class="chat-header">
          <span class="back" @click="$router.back()">← 返回</span>
          <span class="chat-title">💬 {{ orderId ? '订单 #'+orderId+' 对话' : '交换 #'+swapId+' 对话' }}</span>
        </div>
        <div class="chat-body" ref="chatBody">
          <div v-for="m in messages" :key="m.id" :class="['msg', m.sender_id===auth.user?.id ? 'mine' : 'other', m.sender_role==='admin' ? 'admin' : '']">
            <div class="msg-sender">{{ m.sender_name }}<el-tag v-if="m.sender_role==='admin'" size="small" type="danger" effect="dark" class="admin-tag">管理</el-tag></div>
            <div class="msg-content">{{ m.content }}</div>
            <div class="msg-time">{{ formatTime(m.created_at) }}</div>
          </div>
          <div v-if="!messages.length" class="empty-hint">暂无消息，发送第一条消息吧</div>
        </div>
        <div class="chat-input">
          <el-input v-model="text" placeholder="输入消息..." @keyup.enter="send" :rows="2" type="textarea"/>
          <el-button type="primary" @click="send" :disabled="!text.trim()">发送</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/api'
import NavHeader from '@/components/NavHeader.vue'
const route = useRoute()
const auth = useAuthStore()
const orderId = ref(route.query.order_id ? Number(route.query.order_id) : null)
const swapId = ref(route.query.swap_id ? Number(route.query.swap_id) : null)
const messages = ref([])
const text = ref('')
const chatBody = ref(null)
let timer = null

async function fetchMessages(isInit) {
  try {
    const params = {}
    if (orderId.value) params.order_id = orderId.value
    if (swapId.value) params.swap_id = swapId.value
    const data = await api.getMessages(params)
    if (Array.isArray(data)) messages.value = data
    if (isInit) { await nextTick(); if (chatBody.value) chatBody.value.scrollTop = chatBody.value.scrollHeight }
  } catch {}
}

async function send() {
  if (!text.value.trim()) return
  if (!auth.isLoggedIn) { ElMessage.warning('请先登录'); return }
  const payload = {
    sender_id: auth.user.id,
    sender_name: auth.userName,
    sender_role: auth.isAdmin ? 'admin' : 'user',
    content: text.value.trim()
  }
  if (orderId.value) payload.order_id = orderId.value
  if (swapId.value) payload.swap_id = swapId.value
  try {
    await api.sendMessage(payload)
    text.value = ''
    await fetchMessages()
  } catch { ElMessage.error('发送失败') }
}

function formatTime(t) {
  if (!t) return ''
  return new Date(t).toLocaleString('zh-CN')
}

onMounted(() => {
  fetchMessages(true)
  timer = setInterval(() => fetchMessages(false), 5000)
})
onUnmounted(() => { clearInterval(timer) })
</script>

<style scoped>
.page { min-height: 100vh; background: var(--bg); }
.wrap { max-width: 800px; margin: 0 auto; padding: 20px; }
.chat-card { background: #fff; border-radius: var(--radius); box-shadow: var(--shadow); display: flex; flex-direction: column; height: calc(100vh - 120px); }
.chat-header { padding: 12px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 12px; }
.back { cursor: pointer; color: var(--primary); font-size: 14px; user-select: none; }
.back:hover { text-decoration: underline; }
.chat-title { font-weight: 600; color: var(--text); font-size: 15px; }
.chat-body { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.msg { max-width: 70%; padding: 10px 14px; border-radius: 12px; }
.msg.mine { align-self: flex-end; background: linear-gradient(135deg, var(--primary), var(--primary-hover)); color: #fff; }
.msg.other { align-self: flex-start; background: #f5f3f0; color: var(--text); }
.msg.admin { background: linear-gradient(135deg, #c0392b, #e74c3c); color: #fff; }
.msg.admin .msg-content { color: #fff; }
.msg-sender { font-size: 11px; margin-bottom: 4px; opacity: 0.8; display: flex; align-items: center; gap: 6px; }
.msg-content { font-size: 14px; line-height: 1.5; word-break: break-word; }
.msg-time { font-size: 10px; opacity: 0.6; margin-top: 4px; text-align: right; }
.admin-tag { transform: scale(0.8); }
.chat-input { padding: 12px 16px; border-top: 1px solid var(--border); display: flex; gap: 10px; align-items: flex-end; }
.empty-hint { text-align: center; color: var(--text-muted); padding: 40px; font-size: 14px; }
</style>
