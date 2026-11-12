<template>
  <div>
    <div class="ph"><h2>订单管理</h2></div>
    <el-card shadow="never">
      <div style="margin-bottom:12px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <el-select v-model="statusFilter" placeholder="全部状态" size="small" clearable style="width:130px">
          <el-option label="全部状态" value=""/>
          <el-option v-for="s in statusList" :key="s" :label="s" :value="s"/>
        </el-select>
        <el-input v-model="orderSearch" placeholder="搜索订单号/用户名" size="small" clearable style="width:220px" :prefix-icon="Search"/>
      </div>
      <el-table :data="sorted" border stripe v-if="!load">
        <el-table-column prop="id" label="ID" width="60"/>
        <el-table-column prop="order_no" label="订单号" width="155"/>
        <el-table-column prop="user_name" label="用户" width="85"/>
        <el-table-column label="商品" min-width="180"><template #default="{ row: r }"><span v-for="(it,i) in r.items" :key="i">{{it.book_name||it.name}}×{{it.quantity}}<template v-if="i<r.items.length-1">、</template></span></template></el-table-column>
        <el-table-column label="金额" width="75"><template #default="{ row: r }">¥{{r.total}}</template></el-table-column>
        <el-table-column prop="address" label="地址" width="100"/>
        <el-table-column label="状态" width="85"><template #default="{ row: r }"><el-tag size="small" :type="tagType(r.status)">{{r.status}}</el-tag></template></el-table-column>
        <el-table-column label="操作" width="170" fixed="right">
          <template #default="{ row: r }">
            <el-button v-if="r.status==='待发货'" text type="primary" size="small" @click="ship(r.id)">发货</el-button>
            <el-button v-if="r.status==='待发货'" text type="danger" size="small" @click="cancel(r.id)">取消</el-button>
            <el-button v-if="r.status==='申请退货'" text type="success" size="small" @click="approveRefund(r.id)">同意退货</el-button>
            <el-button v-if="r.status==='申请退货'" text type="danger" size="small" @click="rejectRefund(r.id)">拒绝</el-button>
            <el-button v-if="r.status==='退货中'" text type="primary" size="small" @click="completeRefund(r.id)">确认退货</el-button>
            <span v-if="['待付款','已发货','已签收','已完成','已取消','已退货'].includes(r.status)" class="noact">—</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { useOrderStore } from '@/stores/order'
const orderStore = useOrderStore(); const load = ref(false)
const statusFilter = ref(''); const orderSearch = ref('')
const statusList = ['待付款','待发货','已发货','已签收','已完成','已取消','申请退货','退货中','已退货']
const sorted = computed(() => {
  let list = [...orderStore.orders]
  if (statusFilter.value) list = list.filter(o => o.status === statusFilter.value)
  if (orderSearch.value) {
    const kw = orderSearch.value.toLowerCase()
    list = list.filter(o => (o.order_no||'').toLowerCase().includes(kw) || (o.user_name||'').toLowerCase().includes(kw))
  }
  return list.sort((a, b) => b.id - a.id)
})

onMounted(async ()=>{ load.value=true; await orderStore.fetchOrders(); load.value=false })

function tagType(s) {
  const m = { '待付款': 'danger', '待发货': 'warning', '已发货': 'primary', '已签收': 'success', '已完成': '', '已取消': 'info', '申请退货': 'danger', '退货中': 'warning', '已退货': 'info' }
  return m[s] || 'info'
}

async function ship(id) { await orderStore.updateStatus(id,'已发货'); ElMessage.success('已发货') }
async function cancel(id) {
  try { await ElMessageBox.confirm('确定取消该订单？', '提示', { type: 'warning' }) } catch { return }
  await orderStore.updateStatus(id,'已取消'); ElMessage.success('已取消')
}
async function approveRefund(id) { await orderStore.updateStatus(id,'退货中'); ElMessage.success('已同意退货') }
async function rejectRefund(id) {
  try { await ElMessageBox.confirm('确定拒绝退货申请？', '提示', { type: 'warning' }) } catch { return }
  await orderStore.updateStatus(id,'已完成'); ElMessage.success('已拒绝退货')
}
async function completeRefund(id) { await orderStore.updateStatus(id,'已退货'); ElMessage.success('退货完成') }
</script>

<style scoped>
.ph { margin-bottom: 18px; }
.ph h2 { margin: 0; font-size: 22px; color: #1e293b; font-weight: 700; }
.noact { color: var(--text-muted); font-size: 12px; }
:deep(.el-card) { border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 1px 4px rgba(0,0,0,0.03); }
:deep(.el-table th) { background: #f8fafc; color: #64748b; font-weight: 600; font-size: 12px; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; }
:deep(.el-table tr:hover td) { background: #fdf8f2 !important; }
</style>
