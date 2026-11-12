<template>
  <div>
    <div class="ph"><h2>控制台</h2></div>
    <el-row :gutter="18">
      <el-col :span="6" v-for="s in stats" :key="s.l">
        <div class="stat clickable" @click="goTo(s)"><div class="sv">{{ s.v }}</div><div class="sl">{{ s.l }}</div><div class="si">{{ s.i }}</div></div>
      </el-col>
    </el-row>
    <el-row :gutter="18" style="margin-top:18px">
      <el-col :span="14">
        <el-card header="图书分类统计" shadow="never">
          <div class="bar" v-for="c in catS" :key="c.n"><span class="bn">{{c.n}}</span><div class="bp"><div class="bf" :style="{width:c.p+'%'}"></div></div><span class="bc">{{c.c}}</span></div>
          <el-empty v-if="!catS.length" :image-size="50" description="暂无数据"/>
        </el-card>
      </el-col>
      <el-col :span="10">
        <el-card header="最近订单" shadow="never">
          <el-table :data="recent" size="small">
            <el-table-column prop="order_no" label="单号" width="140"/>
            <el-table-column prop="user_name" label="用户" width="70"/>
            <el-table-column label="金额" width="70"><template #default="{ row: r }">¥{{r.total}}</template></el-table-column>
            <el-table-column label="状态" width="80"><template #default="{ row: r }"><el-tag size="small" :type="r.status==='待发货'?'warning':'success'">{{r.status}}</el-tag></template></el-table-column>
          </el-table>
          <el-empty v-if="!recent.length" :image-size="50"/>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="salesDlg.vis" title="销售明细" width="700px" destroy-on-close>
      <el-table :data="salesDlg.list" border stripe size="small" max-height="400">
        <el-table-column prop="order_no" label="订单号" width="160"/>
        <el-table-column prop="user_name" label="用户" width="90"/>
        <el-table-column label="商品" min-width="180"><template #default="{row:r}"><span v-for="(it,i) in (r.items||[])" :key="i">{{it.book_name||it.name}}×{{it.quantity}}<template v-if="i<(r.items||[]).length-1">、</template></span></template></el-table-column>
        <el-table-column label="金额" width="80"><template #default="{row:r}">¥{{r.total}}</template></el-table-column>
        <el-table-column prop="created_at" label="时间" width="150"/>
      </el-table>
      <template #footer><el-button @click="salesDlg.vis=false">关闭</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBookStore } from '@/stores/book'
import { useOrderStore } from '@/stores/order'
import { api } from '@/api'

const router = useRouter()
const bookStore = useBookStore()
const orderStore = useOrderStore()
const userCount = ref(0)

onMounted(async () => {
  try { await bookStore.fetchBooks() } catch {}
  try { await bookStore.fetchCategories() } catch {}
  try { await orderStore.fetchOrders() } catch {}
  try { const s = await api.getStats(); userCount.value = s?.users || 0 } catch {}
})

const bookList = computed(() => Array.isArray(bookStore.books) ? [...bookStore.books].sort((a,b)=>b.id-a.id) : [])
const orderList = computed(() => Array.isArray(orderStore.orders) ? [...orderStore.orders].sort((a,b)=>b.id-a.id) : [])

const totalSales = computed(() =>
  orderList.value.filter(o => o.status === '已完成').reduce((s, o) => s + Number(o.total || 0), 0)
)

const stats = computed(() => [
  { l: '图书总数', v: bookList.value.length, i: '📚' },
  { l: '注册用户', v: userCount.value, i: '👥' },
  { l: '订单总数', v: orderList.value.length, i: '📋' },
  { l: '总销售额', v: '¥' + totalSales.value, i: '💰' },
])

const catS = computed(() => {
  if (!bookList.value.length) return []
  const map = {}
  for (const b of bookList.value) {
    if (b.category) map[b.category] = (map[b.category] || 0) + 1
  }
  const max = Math.max(...Object.values(map))
  return Object.entries(map)
    .map(([n, c]) => ({ n, c, p: max > 0 ? Math.round(c / max * 100) : 0 }))
    .sort((a, b) => b.c - a.c)
})

const recent = computed(() => orderList.value.slice(0, 5))

const pageMap = { '图书总数': '/admin/books', '注册用户': '/admin/users', '订单总数': '/admin/orders', '总销售额': '/admin/orders' }
function goTo(s) {
  if (s.l === '总销售额') {
    salesDlg.list = orderList.value.filter(o => o.status === '已完成')
    salesDlg.vis = true
    return
  }
  const path = pageMap[s.l]
  if (path) router.push(path)
}
const salesDlg = reactive({ vis: false, list: [] })
</script>

<style scoped>
.ph { margin-bottom: 16px; }
.ph h2 { margin: 0; font-size: 22px; color: #1e293b; font-weight: 700; }

/* Stat cards */
.stat {
  background: #fff; border-radius: 14px; padding: 24px 20px; position: relative; overflow: hidden;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04); border: 1px solid #e2e8f0;
  transition: all 0.3s cubic-bezier(.4,0,.2,1);
}
.stat::before {
  content: ''; position: absolute; top: -20px; right: -20px; width: 80px; height: 80px;
  border-radius: 50%; opacity: 0.05; transition: all 0.3s;
}
.stat:nth-child(1)::before{background:#8b6040}
.stat:nth-child(2)::before{background:#6b8b40}
.stat:nth-child(3)::before{background:#c08848}
.stat:nth-child(4)::before{background:#b06040}
.stat:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); border-color: #cbd5e1; }
.stat:hover::before { opacity: 0.1; transform: scale(1.2); }
.stat.clickable { cursor: pointer; }
.sv { font-size: 30px; font-weight: 800; color: #1e293b; position: relative; z-index: 1; }
.sl { font-size: 13px; color: #64748b; margin-top: 6px; font-weight: 500; position: relative; z-index: 1; }
.si { position: absolute; right: 18px; top: 18px; font-size: 26px; opacity: 0.7; z-index: 1; }

/* Bar chart */
.bar { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.bn { width: 80px; font-size: 13px; color: #475569; font-weight: 500; }
.bp { flex: 1; height: 20px; background: #f1f5f9; border-radius: 10px; overflow: hidden; }
.bf { height: 100%; background: linear-gradient(90deg, #8b6040, #c09868); border-radius: 10px; transition: width 0.4s; }
.bc { font-size: 13px; color: #64748b; min-width: 24px; text-align: right; font-weight: 600; }
</style>
