<template>
  <div class="page">
    <NavHeader />
    <div class="wrap" v-if="post">
      <el-breadcrumb separator=">" class="bread">
        <el-breadcrumb-item :to="{path:'/forum'}">论坛</el-breadcrumb-item>
        <el-breadcrumb-item>{{ post.title }}</el-breadcrumb-item>
      </el-breadcrumb>
      <el-card shadow="never" class="card">
        <div class="post-full">
          <h2>{{ post.title }}</h2>
          <div class="post-info">
            <span>{{ post.user_name }}</span>
            <span>{{ formatTime(post.created_at) }}</span>
            <span>👁 {{ post.view_count || 0 }}</span>
            <span>💬 {{ post.reply_count || 0 }}</span>
          </div>
          <div class="post-content">{{ post.content }}</div>
        </div>
      </el-card>
      
      <h3 class="reply-title">回复 ({{ replies.length }})</h3>
      <div v-if="replies.length" class="replies">
        <div v-for="r in replies" :key="r.id" class="reply-item">
          <div class="reply-head">
            <span class="r-user">{{ r.user_name }}</span>
            <span class="r-time">{{ formatTime(r.created_at) }}</span>
          </div>
          <div class="reply-content">{{ r.content }}</div>
        </div>
      </div>
      <el-empty v-else :image-size="60" description="暂无回复"/>
      
      <el-card shadow="never" class="reply-form-card" v-if="auth.isLoggedIn">
        <el-input v-model="replyText" type="textarea" :rows="3" placeholder="写下你的回复..."/>
        <el-button type="primary" @click="doReply" :disabled="!replyText.trim()" style="margin-top:10px">发表回复</el-button>
      </el-card>
      <el-card shadow="never" class="reply-form-card" v-else>
        <div class="login-hint">请<router-link to="/login">登录</router-link>后参与讨论</div>
      </el-card>
    </div>
    <div class="wrap" v-else-if="!loading"><el-empty description="帖子不存在"/></div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/api'
import NavHeader from '@/components/NavHeader.vue'
const route = useRoute()
const auth = useAuthStore()
const post = ref(null)
const replies = ref([])
const replyText = ref('')
const loading = ref(false)
onMounted(async () => {
  loading.value = true
  try {
    const data = await api.getPost(route.params.id)
    post.value = data.post || data
    replies.value = data.replies || []
  } catch {}
  loading.value = false
})
async function doReply() {
  if (!replyText.value.trim()) return
  try {
    await api.addReply(post.value.id, { user_id: auth.user.id, user_name: auth.userName, content: replyText.value.trim() })
    replyText.value = ''
    ElMessage.success('回复成功')
    const data = await api.getPost(route.params.id)
    post.value = data.post || data
    replies.value = data.replies || []
  } catch { ElMessage.error('回复失败') }
}
function formatTime(t) {
  if (!t) return ''
  const d = new Date(t)
  return d.toLocaleDateString('zh-CN') + ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.page { min-height: 100vh; background: var(--bg); }
.wrap { max-width: 900px; margin: 0 auto; padding: 20px; }
.bread { margin-bottom: 16px; }
.card { border-radius: var(--radius); margin-bottom: 20px; }
.post-full h2 { margin: 0 0 10px; font-size: 20px; color: var(--text); }
.post-info { display: flex; gap: 16px; font-size: 12px; color: var(--text-muted); margin-bottom: 16px; }
.post-content { font-size: 15px; color: var(--text); line-height: 1.8; white-space: pre-wrap; }
.reply-title { font-size: 16px; color: var(--text); margin-bottom: 12px; font-weight: 600; }
.replies { margin-bottom: 20px; }
.reply-item { padding: 14px; background: #fff; border-radius: var(--radius); margin-bottom: 8px; box-shadow: var(--shadow); }
.reply-head { display: flex; justify-content: space-between; margin-bottom: 8px; }
.r-user { font-weight: 600; color: var(--primary); font-size: 13px; }
.r-time { color: var(--text-muted); font-size: 12px; }
.reply-content { font-size: 14px; color: var(--text); line-height: 1.6; white-space: pre-wrap; }
.reply-form-card { border-radius: var(--radius); }
.login-hint { text-align: center; color: var(--text-muted); font-size: 14px; }
.login-hint a { color: var(--primary); }
</style>
