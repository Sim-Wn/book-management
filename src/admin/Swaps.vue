<template>
  <div>
    <div class="ph"><h2>交换管理</h2></div>
    <el-card shadow="never">
      <div style="margin-bottom:12px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <el-select v-model="statusFilter" placeholder="全部状态" size="small" clearable style="width:130px">
          <el-option label="全部状态" value=""/>
          <el-option v-for="s in statusList" :key="s" :label="s" :value="s"/>
        </el-select>
      </div>
      <el-table :data="sorted" border stripe v-if="!load">
        <el-table-column prop="id" label="ID" width="60"/>
        <el-table-column label="发起方" width="100">
          <template #default="{ row: r }">{{ r.from_user_name || '用户#'+r.from_user_id }}</template>
        </el-table-column>
        <el-table-column label="接收方" width="100">
          <template #default="{ row: r }">{{ r.to_user_name || '用户#'+r.to_user_id }}</template>
        </el-table-column>
        <el-table-column label="发起方书籍" min-width="130">
          <template #default="{ row: r }">{{ r.from_book_name }}</template>
        </el-table-column>
        <el-table-column label="接收方书籍" min-width="130">
          <template #default="{ row: r }">{{ r.to_book_name }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row: r }">
            <el-tag size="small" :type="tagType(r.status)">{{ r.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="140">
          <template #default="{ row: r }">{{ formatTime(r.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="170" fixed="right">
          <template #default="{ row: r }">
            <el-button v-if="r.status==='待确认'" text type="success" size="small" @click="forceStatus(r.id,'已同意')">强制同意</el-button>
            <el-button v-if="r.status==='待确认'" text type="danger" size="small" @click="forceStatus(r.id,'已拒绝')">强制拒绝</el-button>
            <el-button v-if="r.status==='已同意'" text type="primary" size="small" @click="forceStatus(r.id,'已完成')">完成交换</el-button>
            <el-button v-if="r.status==='已拒绝'" text type="warning" size="small" @click="forceStatus(r.id,'待确认')">重置待确认</el-button>
            <span v-if="r.status==='已完成'" class="noact">—</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '@/api'
const swaps = ref([]); const load = ref(false)
const statusFilter = ref('')
const statusList = ['待确认','已同意','已拒绝','已完成']
const sorted = computed(() => {
  let list = [...swaps.value]
  if (statusFilter.value) list = list.filter(s => s.status === statusFilter.value)
  return list.sort((a, b) => b.id - a.id)
})

onMounted(async () => {
  load.value = true
  try { const data = await api.adminGetAllSwaps(); swaps.value = Array.isArray(data) ? data : [] } catch {}
  load.value = false
})

function tagType(s) {
  const m = { '待确认':'warning','已同意':'success','已完成':'','已拒绝':'danger' }
  return m[s] || 'info'
}

async function forceStatus(id, status) {
  try { await ElMessageBox.confirm(`确定将交换 #${id} 改为「${status}」？`, '提示', { type: 'warning' }) } catch { return }
  try {
    const res = await api.adminForceSwapStatus(id, status)
    if (res.ok) {
      ElMessage.success('状态已更新')
      const idx = swaps.value.findIndex(s => s.id === id)
      if (idx >= 0) swaps.value[idx].status = status
    } else ElMessage.error(res.msg || '操作失败')
  } catch { ElMessage.error('操作失败') }
}

function formatTime(t) {
  if (!t) return ''
  const d = new Date(t); const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
</script>

<style scoped>
.ph { margin-bottom: 18px; }
.ph h2 { margin: 0; font-size: 22px; color: #1e293b; font-weight: 700; }
.noact { color: var(--text-muted); font-size: 12px; }
:deep(.el-card) { border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 1px 4px rgba(0,0,0,0.03); }
:deep(.el-table th) { background: #f8fafc; color: #64748b; font-weight: 600; font-size: 12px; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; }
:deep(.el-table tr:hover td) { background: #fdf8f2 !important; }
</style>
