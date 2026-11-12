<template>
  <div class="page">
    <NavHeader />
    <div class="wrap">
      <h2 class="title">📝 发新帖</h2>
      <el-card shadow="never" class="card">
        <el-form label-width="60px">
          <el-form-item label="标题" required><el-input v-model="title" placeholder="请输入帖子标题" maxlength="200" show-word-limit/></el-form-item>
          <el-form-item label="内容" required><el-input v-model="content" type="textarea" :rows="8" placeholder="写下你想分享的内容..." maxlength="5000" show-word-limit/></el-form-item>
          <el-form-item>
            <el-button type="primary" @click="doPost" :disabled="!title.trim()||!content.trim()">发布帖子</el-button>
            <el-button @click="$router.push('/forum')">取消</el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/api'
import NavHeader from '@/components/NavHeader.vue'
const router = useRouter()
const auth = useAuthStore()
const title = ref('')
const content = ref('')
async function doPost() {
  if (!auth.isLoggedIn) { ElMessage.warning('请先登录'); router.push('/login'); return }
  try {
    const res = await api.createPost({ user_id: auth.user.id, user_name: auth.userName, title: title.value.trim(), content: content.value.trim() })
    ElMessage.success('发布成功')
    router.push('/forum/' + (res.id || ''))
  } catch { ElMessage.error('发布失败') }
}
</script>

<style scoped>
.page { min-height: 100vh; background: var(--bg); }
.wrap { max-width: 800px; margin: 0 auto; padding: 20px; }
.title { margin-bottom: 16px; font-size: 22px; color: var(--text); }
.card { border-radius: var(--radius); }
</style>
