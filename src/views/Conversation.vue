<template>
  <div class="page">
    <NavHeader />
    <div class="wrap">
      <div class="chat-card">
        <div class="chat-header">
          <span class="back" @click="$router.push('/messages')">← 返回</span>
          <span class="chat-title">💬 {{ peerName }}</span>
        </div>
        <div class="chat-body" ref="chatBody">
          <div v-for="m in messages" :key="m.id" :class="['msg', m.sender_id===auth.user?.id ? 'mine' : 'other']">
            <div class="msg-content">{{ m.content }}</div>
            <div class="msg-time">{{ formatTime(m.created_at) }}</div>
          </div>
          <div v-if="!messages.length" class="empty-hint">还没有消息，打个招呼吧</div>
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
const peerId = ref(Number(route.params.id))
const peerName = ref('')
const messages = ref([])
const text = ref('')
const chatBody = ref(null)
let timer = null

async function fetchMessages(isInit) {
  if (!auth.user?.id) return
  try {
    const data = await api.getPrivateMessages(auth.user.id, peerId.value)
    messages.value = Array.isArray(data) ? data : []
    // get peer name from first message with different sender
    if (!peerName.value && messages.value.length) {
      const peerMsg = messages.value.find(m => m.sender_id !== auth.user?.id)
      if (peerMsg) peerName.value = peerMsg.sender_name || '用户#' + peerId.value
    }
    if (!peerName.value) peerName.value = '用户#' + peerId.value
    if (isInit) { await nextTick(); if (chatBody.value) chatBody.value.scrollTop = chatBody.value.scrollHeight }
    // mark messages from peer as read
    if (isInit && messages.value.length > 0) {
      try { await api.markMessagesRead(auth.user.id, peerId.value) } catch {}
      auth.fetchUnreadCount()
    }
  } catch {}
}

async function send() {
  if (!text.value.trim()) return
  if (!auth.isLoggedIn) { ElMessage.warning('请先登录'); return }
  try {
    await api.sendMessage({
      sender_id: auth.user.id,
      receiver_id: peerId.value,
      sender_name: auth.userName,
      sender_role: 'user',
      content: text.value.trim()
    })
    text.value = ''
    await fetchMessages()
  } catch { ElMessage.error('发送失败') }
}

function formatTime(t) {
  if (!t) return ''
  const d = new Date(t)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
  if (diff < 86400000) return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('zh-CN') + ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

onMounted(() => {
  fetchMessages(true)
  timer = setInterval(() => fetchMessages(false), 5000)
})
onUnmounted(() => { clearInterval(timer) })
</script>

<style scoped>
.page { min-height: 100vh; background: var(--bg); }
.wrap { max-width: 700px; margin: 0 auto; padding: 20px; }
.chat-card { background: #fff; border-radius: var(--radius); box-shadow: var(--shadow); display: flex; flex-direction: column; height: calc(100vh - 120px); }
.chat-header { padding: 12px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 12px; }
.back { cursor: pointer; color: var(--primary); font-size: 14px; user-select: none; }
.back:hover { text-decoration: underline; }
.chat-title { font-weight: 600; color: var(--text); font-size: 15px; }
.chat-body { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.msg { max-width: 75%; padding: 10px 14px; border-radius: 14px; }
.msg.mine { align-self: flex-end; background: linear-gradient(135deg, var(--primary), var(--primary-hover)); color: #fff; }
.msg.other { align-self: flex-start; background: #f5f3f0; color: var(--text); }
.msg-content { font-size: 14px; line-height: 1.5; word-break: break-word; }
.msg-time { font-size: 10px; opacity: 0.65; margin-top: 4px; text-align: right; }
.chat-input { padding: 12px 16px; border-top: 1px solid var(--border); display: flex; gap: 10px; align-items: flex-end; }
.empty-hint { text-align: center; color: var(--text-muted); padding: 40px; font-size: 14px; }
</style>
