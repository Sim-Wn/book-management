<template>
  <div class="page">
    <NavHeader />
    <div class="wrap" v-if="loading"><el-skeleton :rows="6" animated /></div>
    <div class="wrap" v-else-if="!order">
      <el-empty description="订单不存在，或你没有权限查看">
        <el-button type="primary" @click="$router.push('/orders')">返回订单列表</el-button>
      </el-empty>
    </div>
    <div class="wrap" v-else>
      <el-breadcrumb separator=">" class="bread">
        <el-breadcrumb-item :to="{ path: '/orders' }">我的订单</el-breadcrumb-item>
        <el-breadcrumb-item>{{ order.order_no }}</el-breadcrumb-item>
      </el-breadcrumb>

      <el-card shadow="never" class="card">
        <div class="head">
          <div class="hl">
            <span class="no">订单号：{{ order.order_no }}</span>
            <span class="time">{{ formatDateTime(order.created_at) }}</span>
          </div>
          <el-tag :type="tagType(order.status)" size="large">{{ order.status }}</el-tag>
        </div>

        <el-steps :active="step" finish-status="success" align-center class="steps">
          <el-step v-for="s in activeSteps" :key="s" :title="s" />
        </el-steps>

        <el-table :data="order.items" size="small" class="items">
          <el-table-column label="图书" min-width="220"><template #default="{ row: r }">{{ r.book_name }}</template></el-table-column>
          <el-table-column label="单价" width="100"><template #default="{ row: r }">¥{{ r.price }}</template></el-table-column>
          <el-table-column label="数量" width="80"><template #default="{ row: r }">{{ r.quantity }}</template></el-table-column>
          <el-table-column label="小计" width="110"><template #default="{ row: r }">¥{{ (r.price * r.quantity).toFixed(2) }}</template></el-table-column>
        </el-table>

        <div class="info">
          <div v-if="!isBuyer"><span class="k">买家</span>{{ order.buyer_name || order.user_name }}</div>
          <div><span class="k">收货</span>{{ order.user_name }} · {{ order.phone }} · {{ order.address }}</div>
          <div v-if="order.remark"><span class="k">备注</span>{{ order.remark }}</div>
        </div>

        <div class="total">合计 <strong>¥{{ order.total }}</strong></div>

        <div class="acts" v-if="order.status !== '已取消' && order.status !== '已退货' && order.status !== '已完成'">
          <template v-if="isBuyer">
            <el-button v-if="order.status === '待付款'" type="success" @click="pay">去支付</el-button>
            <el-button v-if="order.status === '待付款' || order.status === '待发货'" type="danger" @click="cancel">取消订单</el-button>
            <el-button v-if="order.status === '已发货'" type="primary" @click="receive">确认收货</el-button>
            <el-button v-if="order.status === '已签收'" type="success" @click="complete">确认完成</el-button>
            <el-button v-if="order.status === '已签收'" type="warning" @click="refund">申请退货</el-button>
          </template>
          <template v-if="isSeller">
            <el-button v-if="order.status === '待发货'" type="primary" @click="ship">发货</el-button>
            <el-button v-if="order.status === '待发货'" type="danger" @click="cancel">取消订单</el-button>
            <span v-if="order.status === '待付款'" class="hint">等待买家付款</span>
          </template>
        </div>
        <div class="hint" v-else-if="order.status === '申请退货'">退货申请已提交，等待商家在后台处理</div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { useOrderStore } from '@/stores/order'
import NavHeader from '@/components/NavHeader.vue'
import { formatDateTime } from '@/utils/format'

const route = useRoute()
const auth = useAuthStore()
const orderStore = useOrderStore()
const order = ref(null)
const loading = ref(true)

const isBuyer = computed(() => auth.user && order.value && String(order.value.user_id) === String(auth.user.id))
const isSeller = computed(() => auth.user && order.value && String(order.value.seller_id) === String(auth.user.id))

const step = computed(() => {
  const s = order.value?.status
  if (s === '已完成') return 5
  if (['申请退货', '退货中', '已退货'].includes(s)) return 4
  return Math.max(0, orderStore.statusFlow.indexOf(s))
})
const activeSteps = computed(() => {
  const s = order.value?.status
  if (s === '已取消') return ['已取消']
  if (s === '申请退货') return ['待付款', '待发货', '已发货', '已签收', '申请退货']
  if (s === '退货中') return ['待付款', '待发货', '已发货', '已签收', '退货中']
  if (s === '已退货') return ['待付款', '待发货', '已发货', '已签收', '已退货']
  return orderStore.statusFlow
})
function tagType(s) {
  const m = { '待付款': 'danger', '待发货': 'warning', '已发货': 'primary', '已签收': 'success', '已完成': '', '已取消': 'info', '申请退货': 'danger', '退货中': 'warning', '已退货': 'info' }
  return m[s] || 'info'
}

async function load() {
  loading.value = true
  try {
    order.value = await api.getOrder(route.params.id)
  } catch {
    order.value = null
  }
  loading.value = false
}
onMounted(load)

async function run(fn, okMsg) {
  try {
    const r = await fn(order.value.id)
    if (r && r.ok === false) return ElMessage.error(r.msg || '操作失败')
    ElMessage.success(okMsg)
    await load()
  } catch (e) {
    ElMessage.error(e.message || '操作失败')
  }
}

async function pay() {
  try { await ElMessageBox.confirm(`确认支付 ¥${order.value.total}？(模拟支付)`, '支付确认', { type: 'success' }) } catch { return }
  run((id) => api.payOrder(id), '支付成功，等待发货')
}
async function cancel() {
  try { await ElMessageBox.confirm('确定取消该订单？', '提示', { type: 'warning' }) } catch { return }
  run((id) => api.cancelOrder(id), '已取消')
}
async function receive() {
  run((id) => api.receiveOrder(id), '已确认收货')
}
async function complete() {
  try { await ElMessageBox.confirm('确认订单已完成？', '提示', { type: 'success' }) } catch { return }
  run((id) => api.updateOrderStatus(id, '已完成'), '订单已完成')
}
async function refund() {
  try { await ElMessageBox.confirm('确定申请退货退款？退货需商家审核。', '提示', { type: 'warning' }) } catch { return }
  run((id) => api.refundOrder(id), '退货申请已提交')
}
async function ship() {
  run((id) => api.updateOrderStatus(id, '已发货'), '已发货')
}
</script>

<style scoped>
.page { min-height: 100vh; background: var(--bg); }
.wrap { max-width: 900px; margin: 0 auto; padding: 20px; }
.bread { margin-bottom: 14px; }
.card { border-radius: 12px; border: 1px solid #f0ebe0; }
.head { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
.hl { display: flex; gap: 16px; font-size: 13px; color: var(--text-secondary); flex-wrap: wrap; }
.no { font-weight: 700; color: var(--text); }
.steps { margin: 8px 0 18px; }
.items { margin-bottom: 14px; }
.info { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: var(--text-secondary); background: #fdfbf7; border-radius: 8px; padding: 12px 14px; }
.k { display: inline-block; width: 42px; color: var(--text-muted); }
.total { text-align: right; font-size: 16px; color: var(--text-secondary); margin: 16px 0 8px; }
.total strong { font-size: 26px; color: var(--danger); }
.acts { display: flex; gap: 10px; flex-wrap: wrap; }
.hint { font-size: 13px; color: var(--text-muted); padding: 6px 0; }
@media (max-width: 768px) {
  .wrap { padding: 14px; }
  .steps :deep(.el-step__title) { font-size: 10px; }
}
</style>
