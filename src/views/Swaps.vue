<template>
  <div class="page">
    <NavHeader />
    <div class="wrap">
      <h2 class="title">📦 图书交换</h2>
      <el-card shadow="never" class="card" v-if="swaps.length || loading">
        <div v-for="s in swaps" :key="s.id" class="swap-item">
          <div class="swap-top">
            <div class="swap-users">
              <span class="u">{{ s.from_user_name || '用户'+s.from_user_id }}</span>
              <span class="arrow">⟷</span>
              <span class="u">{{ s.to_user_name || '用户'+s.to_user_id }}</span>
            </div>
            <el-tag :type="s.status==='待确认'?'warning':s.status==='已同意'?'success':s.status==='已完成'?'':'danger'" size="small">{{ s.status }}</el-tag>
          </div>
          <div class="swap-books">
            <div class="sb"><span class="emoji">📗</span><span>{{ s.from_book_name }}</span></div>
            <span class="swap-arrow">⇄</span>
            <div class="sb"><span class="emoji">📕</span><span>{{ s.to_book_name }}</span></div>
          </div>
          <div class="swap-acts" v-if="s.status==='待确认'">
            <el-button v-if="s.to_user_id===auth.user?.id && !s.to_agreed" type="primary" size="small" @click="doAgree(s)">同意交换</el-button>
            <el-button v-if="s.to_user_id===auth.user?.id && !s.to_agreed" type="danger" size="small" plain @click="doReject(s)">拒绝</el-button>
            <el-button v-if="s.from_user_id===auth.user?.id && !s.from_agreed" type="primary" size="small" @click="doAgree(s)">确认交换</el-button>
            <el-button v-if="s.from_user_id===auth.user?.id && !s.from_agreed" type="danger" size="small" plain @click="doReject(s)">取消交换</el-button>
            <el-tag v-if="(s.from_agreed||s.to_agreed) && !(s.from_agreed&&s.to_agreed)" size="small" type="info">等待对方确认</el-tag>
          </div>
        </div>
      </el-card>
      <el-empty v-else :image-size="80" description="暂无交换记录"/>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useSwapStore } from '@/stores/swap'
import { useAuthStore } from '@/stores/auth'
import NavHeader from '@/components/NavHeader.vue'
const swapStore = useSwapStore()
const auth = useAuthStore()
const loading = ref(false)
const swaps = computed(() => swapStore.swaps)
onMounted(async () => {
  loading.value = true
  if (auth.user?.id) await swapStore.fetchSwaps(auth.user.id)
  loading.value = false
})
async function doAgree(s) {
  const res = await swapStore.agreeSwap(s.id, auth.user?.id)
  if (res.ok) ElMessage.success(s.from_user_id===auth.user?.id ? '已确认交换' : '已同意交换')
  else ElMessage.error(res.msg || '操作失败')
}
async function doReject(s) {
  const res = await swapStore.rejectSwap(s.id, auth.user?.id)
  if (res.ok) ElMessage.success(s.from_user_id===auth.user?.id ? '已取消交换' : '已拒绝交换')
  else ElMessage.error(res.msg || '操作失败')
}
</script>

<style scoped>
.page { min-height: 100vh; background: #f8fafc; }
.wrap { max-width: 900px; margin: 0 auto; padding: 20px; }
.title { margin-bottom: 18px; font-size: 22px; color: #1e293b; font-weight: 700; }
.card { border-radius: 14px; border: 1px solid #e2e8f0; box-shadow: 0 1px 4px rgba(0,0,0,0.03); }
.swap-item { padding: 18px 20px; border-bottom: 1px solid #f1f5f9; transition: background 0.2s; }
.swap-item:last-child { border-bottom: none; }
.swap-item:hover { background: #fdf8f2; }
.swap-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.swap-users { display: flex; align-items: center; gap: 12px; }
.u { font-weight: 600; color: #1e293b; font-size: 14px; background: #f1f5f9; padding: 4px 12px; border-radius: 20px; }
.arrow { color: #8b6040; font-size: 20px; font-weight: 700; }
.swap-books { display: flex; align-items: center; gap: 14px; margin-bottom: 12px; }
.sb { display: flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #fefce8, #fffbeb); padding: 10px 16px; border-radius: 12px; font-size: 14px; color: #475569; flex: 1; border: 1px solid #fef3c7; }
.swap-arrow { color: #8b6040; font-weight: 700; font-size: 18px; }
.emoji { font-size: 20px; }
.swap-acts { display: flex; gap: 10px; align-items: center; }
</style>
