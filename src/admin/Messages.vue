<template>
  <div>
    <div class="ph"><h2>消息管理</h2></div>
    <el-card shadow="never">
      <div style="margin-bottom:12px;display:flex;gap:12px;align-items:center">
        <el-input v-model="filterId" placeholder="输入订单/交换/用户ID筛选" clearable style="width:260px" size="small"/>
        <el-radio-group v-model="filterType" size="small">
          <el-radio-button value="all">全部</el-radio-button>
          <el-radio-button value="order">订单</el-radio-button>
          <el-radio-button value="swap">交换</el-radio-button>
          <el-radio-button value="pm">私信</el-radio-button>
        </el-radio-group>
      </div>
      <el-table :data="filteredMessages" border stripe v-if="filteredMessages.length">
        <el-table-column prop="id" label="ID" width="70"/>
        <el-table-column prop="sender_name" label="发送者" width="100"/>
        <el-table-column label="接收者" width="100">
          <template #default="{ row: r }">
            <span v-if="r.receiver_id">用户#{{ r.receiver_id }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="角色" width="70">
          <template #default="{ row: r }">
            <el-tag size="small" :type="r.sender_role==='admin'?'danger':'info'">{{ r.sender_role }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="content" label="内容" min-width="200" show-overflow-tooltip/>
        <el-table-column label="关联" width="110">
          <template #default="{ row: r }">
            <span v-if="r.order_id">订单#{{ r.order_id }}</span>
            <span v-else-if="r.swap_id">交换#{{ r.swap_id }}</span>
            <span v-else-if="r.receiver_id">私信→{{ r.receiver_id }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="时间" width="160"/>
      </el-table>
      <el-empty v-else :image-size="50" description="暂无消息"/>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '@/api'
const messages = ref([])
const filterId = ref('')
const filterType = ref('all')
onMounted(async () => {
  try { const data = await api.getMessages(); if (Array.isArray(data)) messages.value = data } catch {}
})
const filteredMessages = computed(() => {
  let list = [...messages.value]
  if (filterId.value) {
    const id = Number(filterId.value)
    if (!isNaN(id)) list = list.filter(m => m.order_id === id || m.swap_id === id || m.sender_id === id || m.receiver_id === id)
  }
  if (filterType.value === 'order') list = list.filter(m => m.order_id)
  else if (filterType.value === 'swap') list = list.filter(m => m.swap_id)
  else if (filterType.value === 'pm') list = list.filter(m => m.receiver_id)
  return list.sort((a, b) => b.id - a.id)
})
</script>

<style scoped>
.ph { margin-bottom: 18px; }
.ph h2 { margin: 0; font-size: 22px; color: #1e293b; font-weight: 700; }
:deep(.el-card) { border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 1px 4px rgba(0,0,0,0.03); }
:deep(.el-table th) { background: #f8fafc; color: #64748b; font-weight: 600; font-size: 12px; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; }
:deep(.el-table tr:hover td) { background: #fdf8f2 !important; }
</style>
