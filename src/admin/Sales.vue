<template>
  <div>
    <div class="ph"><h2>销售统计</h2></div>
    <el-row :gutter="18" style="margin-bottom:18px">
      <el-col :span="6" v-for="s in stats" :key="s.l">
        <div class="stat"><div class="sv">{{ s.v }}</div><div class="sl">{{ s.l }}</div><div class="si">{{ s.i }}</div></div>
      </el-col>
    </el-row>
    <el-card shadow="never" header="已完成订单明细">
      <el-table :data="completed" border stripe v-if="!load">
        <el-table-column prop="id" label="ID" width="60"/>
        <el-table-column prop="order_no" label="订单号" width="155"/>
        <el-table-column prop="user_name" label="用户" width="85"/>
        <el-table-column label="商品" min-width="180">
          <template #default="{ row: r }">
            <span v-for="(it,i) in (r.items||[])" :key="i">{{ it.book_name || it.name }}×{{ it.quantity }}<template v-if="i<(r.items||[]).length-1">、</template></span>
          </template>
        </el-table-column>
        <el-table-column label="金额" width="80"><template #default="{ row: r }">¥{{ r.total }}</template></el-table-column>
        <el-table-column label="时间" width="150">
          <template #default="{ row: r }">{{ formatTime(r.created_at) }}</template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!load && !completed.length" :image-size="60" description="暂无完成订单"/>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useOrderStore } from '@/stores/order'

const orderStore = useOrderStore()
const load = ref(false)

onMounted(async () => {
  load.value = true
  try { await orderStore.fetchOrders() } catch {}
  load.value = false
})

const orderList = computed(() =>
  Array.isArray(orderStore.orders) ? [...orderStore.orders].sort((a, b) => b.id - a.id) : []
)

const completed = computed(() => orderList.value.filter(o => o.status === '已完成'))

const totalRevenue = computed(() =>
  completed.value.reduce((s, o) => s + Number(o.total || 0), 0)
)

const todayRevenue = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  return completed.value
    .filter(o => o.created_at && String(o.created_at).slice(0, 10) === today)
    .reduce((s, o) => s + Number(o.total || 0), 0)
})

const stats = computed(() => [
  { l: '总销售额', v: '¥' + totalRevenue.value.toFixed(2), i: '💰' },
  { l: '今日销售额', v: '¥' + todayRevenue.value.toFixed(2), i: '📅' },
  { l: '完成订单数', v: completed.value.length, i: '📋' },
  { l: '客单价', v: completed.value.length ? '¥' + (totalRevenue.value / completed.value.length).toFixed(2) : '¥0', i: '🧾' },
])

function formatTime(t) {
  if (!t) return ''
  const d = new Date(t); const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
</script>

<style scoped>
.ph { margin-bottom: 18px; }
.ph h2 { margin: 0; font-size: 22px; color: #1e293b; font-weight: 700; }
.stat {
  background: #fff; border-radius: 14px; padding: 24px 20px; position: relative; overflow: hidden;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04); border: 1px solid #e2e8f0;
}
.stat::before {
  content: ''; position: absolute; top: -20px; right: -20px; width: 80px; height: 80px;
  border-radius: 50%; opacity: 0.05;
}
.stat:nth-child(1)::before{background:#8b6040}
.stat:nth-child(2)::before{background:#6b8b40}
.stat:nth-child(3)::before{background:#c08848}
.stat:nth-child(4)::before{background:#b06040}
.sv { font-size: 28px; font-weight: 800; color: #1e293b; position: relative; z-index: 1; }
.sl { font-size: 13px; color: #64748b; margin-top: 6px; font-weight: 500; position: relative; z-index: 1; }
.si { position: absolute; right: 18px; top: 18px; font-size: 26px; opacity: 0.7; z-index: 1; }
:deep(.el-card) { border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 1px 4px rgba(0,0,0,0.03); }
:deep(.el-table th) { background: #f8fafc; color: #64748b; font-weight: 600; font-size: 12px; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; }
:deep(.el-table tr:hover td) { background: #fdf8f2 !important; }
</style>
