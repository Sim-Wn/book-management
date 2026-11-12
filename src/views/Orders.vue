<template>
  <div class="page">
    <NavHeader />
    <div class="wrap">
      <h2>我的订单</h2>
      <div style="margin-bottom:12px" v-if="auth.isLoggedIn && orderStore.orders.length">
        <el-radio-group v-model="orderTab" size="small">
          <el-radio-button value="">全部</el-radio-button>
          <el-radio-button value="待付款">待付款</el-radio-button>
          <el-radio-button value="待发货">待发货</el-radio-button>
          <el-radio-button value="已发货">待收货</el-radio-button>
          <el-radio-button value="已签收">已签收</el-radio-button>
          <el-radio-button value="已完成">已完成</el-radio-button>
        </el-radio-group>
      </div>
      <template v-if="!auth.isLoggedIn"><el-empty description="请先登录"><el-button type="primary" @click="$router.push('/login')">去登录</el-button></el-empty></template>
      <template v-else-if="!orders.length"><el-empty description="暂无订单"><el-button type="primary" @click="$router.push('/books')">去逛逛</el-button></el-empty></template>
      <template v-else>
        <el-card v-for="o in orders" :key="o.id" shadow="never" class="oc">
          <template #header>
            <div class="oh">
              <span>订单号：{{ o.order_no }}</span>
              <span>{{ o.created_at || o.createdAt }}</span>
              <el-tag :type="tagType(o.status)" size="small">{{ o.status }}</el-tag>
            </div>
          </template>
          <el-table :data="o.items" size="small">
            <el-table-column label="图书" min-width="200"><template #default="{ row: r }">{{ r.book_name || r.name }}</template></el-table-column>
            <el-table-column label="单价" width="90"><template #default="{ row: r }">¥{{ r.price }}</template></el-table-column>
            <el-table-column label="数量" width="70"><template #default="{ row: r }">{{ r.quantity }}</template></el-table-column>
          </el-table>
          <div class="oi"><span>收货：{{ o.address }}</span><span>电话：{{ o.phone }}</span></div>
          <div class="ot">合计：<strong>¥{{ o.total }}</strong></div>
          <div class="actions" v-if="o.status !== '已取消' && o.status !== '已退货' && o.status !== '已完成'">
            <el-button v-if="o.status === '待付款'" type="success" size="small" @click="doPay(o)">去支付</el-button>
            <el-button v-if="o.status === '待付款' || o.status === '待发货'" type="danger" size="small" @click="doCancel(o)">取消订单</el-button>
            <el-button v-if="o.status === '已发货'" type="primary" size="small" @click="doReceive(o)">确认收货</el-button>
            <el-button v-if="o.status === '已签收'" type="success" size="small" @click="doComplete(o)">确认完成</el-button>
            <el-button v-if="o.status === '已签收'" type="warning" size="small" @click="doRefund(o)">申请退货</el-button>
            <span v-if="o.status === '申请退货'" class="hint">等待商家审核...</span>
            <span v-if="o.status === '退货中'" class="hint">退货处理中...</span>
          </div>
          <div class="steps">
            <el-steps :active="step(o.status)" finish-status="success" align-center>
              <el-step v-for="s in activeSteps(o.status)" :key="s" :title="s"/>
            </el-steps>
          </div>
        </el-card>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { useOrderStore } from '@/stores/order'
import NavHeader from '@/components/NavHeader.vue'
const auth = useAuthStore(); const orderStore = useOrderStore()
const orderTab = ref('')
const orders = computed(() => {
  let list = [...orderStore.orders]
  if (orderTab.value) list = list.filter(o => o.status === orderTab.value)
  return list.sort((a,b)=>b.id-a.id)
})
onMounted(async () => { if(auth.user) await orderStore.fetchOrders(auth.user.id) })

function step(s) { return orderStore.statusFlow.indexOf(s) + 1 }
function activeSteps(status) {
  if (status === '已取消') return ['已取消']
  if (status === '待付款') return orderStore.statusFlow
  if (status === '申请退货') return ['待付款','待发货', '已发货', '已签收', '申请退货']
  if (status === '退货中') return ['待付款','待发货', '已发货', '已签收', '退货中']
  if (status === '已退货') return ['待付款','待发货', '已发货', '已签收', '已退货']
  return orderStore.statusFlow
}
function tagType(s) {
  const m = { '待付款': 'danger', '待发货': 'warning', '已发货': 'primary', '已签收': 'success', '已完成': '', '已取消': 'info', '申请退货': 'danger', '退货中': 'warning', '已退货': 'info' }
  return m[s] || 'info'
}

async function doPay(o) {
  try { await ElMessageBox.confirm(`确认支付 ¥${o.total}？(模拟支付)`, '支付确认', { type: 'success' }) } catch { return }
  const r = await orderStore.payOrder(o.id, auth.user.id)
  r.ok ? ElMessage.success('支付成功，等待发货') : ElMessage.error(r.msg || '支付失败')
}
async function doCancel(o) {
  try { await ElMessageBox.confirm('确定取消该订单？', '提示', { type: 'warning' }) } catch { return }
  const r = await orderStore.cancelOrder(o.id, auth.user.id)
  r.ok ? ElMessage.success('已取消') : ElMessage.error(r.msg || '取消失败')
}
async function doReceive(o) {
  const r = await orderStore.receiveOrder(o.id, auth.user.id)
  r.ok ? ElMessage.success('已确认收货') : ElMessage.error(r.msg || '操作失败')
}
async function doComplete(o) {
  try { await ElMessageBox.confirm('确认订单已完成？', '提示', { type: 'success' }) } catch { return }
  await orderStore.updateStatus(o.id, '已完成', auth.user.id)
  ElMessage.success('订单已完成')
}
async function doRefund(o) {
  try { await ElMessageBox.confirm('确定申请退货退款？退货需商家审核。', '提示', { type: 'warning' }) } catch { return }
  const r = await orderStore.refundOrder(o.id, auth.user.id)
  r.ok ? ElMessage.success('退货申请已提交，等待审核') : ElMessage.error(r.msg || '申请失败')
}
</script>

<style scoped>
.page { min-height: 100vh; background: var(--bg); }
.wrap { max-width: 900px; margin: 0 auto; padding: 20px; }
.wrap h2 { font-size: 22px; color: var(--text); margin: 0 0 18px; font-weight: 700; }
.oc { margin-bottom: 18px; border-radius: 12px; border: 1px solid #f0ebe0; transition: box-shadow 0.2s; }
.oc:hover { box-shadow: 0 4px 16px rgba(80,50,30,0.06); }
.oh { display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: var(--text-secondary); }
.oi { display: flex; gap: 20px; padding: 10px 0; font-size: 13px; color: var(--text-muted); background: #fdfbf7; margin: 8px -20px; padding-left: 20px; padding-right: 20px; border-radius: 8px; }
.ot { text-align: right; font-size: 18px; font-weight: 700; color: var(--danger); padding: 10px 0; }
.actions { display: flex; gap: 8px; padding: 10px 0; flex-wrap: wrap; }
.hint { font-size: 13px; color: var(--text-muted); display: flex; align-items: center; }
.steps { margin-top: 14px; padding: 12px 0 4px; border-top: 1px solid #f5f0e8; }
</style>
