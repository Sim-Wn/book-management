<template>
  <div class="page">
    <NavHeader />
    <div class="wrap">
      <h2>购物车 <span class="sub">({{ cart.totalCount }}件)</span></h2>

      <div v-if="!cart.items.length" class="empty">
        <el-empty description="购物车空空如也" :image-size="120">
          <el-button type="primary" @click="$router.push('/books')">去逛逛</el-button>
        </el-empty>
      </div>

      <template v-else>
        <el-card shadow="never" class="addr-card">
          <div class="addr">
            <el-input v-model="addr" placeholder="收货地址" size="small" style="width:260px" />
            <el-input v-model="phone" placeholder="联系电话" size="small" style="width:160px" />
            <span class="tip">同一卖家的书可以一起下单，不同卖家需要分开提交</span>
          </div>
        </el-card>

        <el-card v-for="g in groups" :key="g.seller" shadow="never" class="group">
          <template #header>
            <div class="gh">
              <span>卖家：<strong>{{ g.seller }}</strong></span>
              <span class="cnt">{{ g.items.length }} 种 / {{ g.count }} 件</span>
            </div>
          </template>

          <el-table :data="g.items">
            <el-table-column label="图书" min-width="300">
              <template #default="{ row: r }">
                <div style="display:flex;align-items:center;gap:12px">
                  <span class="thumb"><BookCover :book="r" variant="thumb" /></span>
                  <div>
                    <div style="font-weight:600">{{ r.name }}</div>
                    <div style="font-size:12px;color:var(--text-muted)">{{ r.author }} | {{ r.condition_grade }}</div>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="单价" width="100"><template #default="{ row: r }">¥{{ r.price }}</template></el-table-column>
            <el-table-column label="数量" width="130">
              <template #default="{ row: r }">
                <el-input-number v-model="r.quantity" :min="1" :max="99" size="small" @change="cart.updateQuantity(r.id, r.quantity)" />
              </template>
            </el-table-column>
            <el-table-column label="小计" width="100"><template #default="{ row: r }">¥{{ (r.price * r.quantity).toFixed(2) }}</template></el-table-column>
            <el-table-column label="操作" width="70">
              <template #default="{ row: r }"><el-button text type="danger" @click="cart.removeItem(r.id)">删除</el-button></template>
            </el-table-column>
          </el-table>

          <div class="gf">
            <span>小计：<strong class="tp">¥{{ g.total.toFixed(2) }}</strong></span>
            <el-button type="primary" :loading="submittingKey === g.seller" @click="submit(g)">提交这笔订单</el-button>
          </div>
        </el-card>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useCartStore } from '@/stores/cart'
import { useOrderStore } from '@/stores/order'
import { useAuthStore } from '@/stores/auth'
import { useBookStore } from '@/stores/book'
import NavHeader from '@/components/NavHeader.vue'
import BookCover from '@/components/BookCover.vue'

const cart = useCartStore()
const orderStore = useOrderStore()
const auth = useAuthStore()
const bookStore = useBookStore()
const router = useRouter()

const addr = ref(auth.user?.address || '')
const phone = ref(auth.user?.phone || '')
const submittingKey = ref('')

// 按卖家分组：后端规定一次订单只能买同一卖家的书
const groups = computed(() => {
  const map = new Map()
  for (const it of cart.items) {
    const seller = it.seller_name || '系统官方'
    if (!map.has(seller)) map.set(seller, { seller, items: [], count: 0, total: 0 })
    const g = map.get(seller)
    g.items.push(it)
    g.count += it.quantity
    g.total += Number(it.price) * it.quantity
  }
  return [...map.values()]
})

async function submit(group) {
  if (!auth.isLoggedIn) { ElMessage.warning('请先登录'); router.push('/login'); return }
  if (!addr.value || !phone.value) { ElMessage.warning('请填写地址和电话'); return }

  // 提交前刷新一次库存
  try { await bookStore.fetchBooks() } catch {}
  const stockErr = group.items.find((it) => {
    const b = bookStore.books.find((x) => x.id === it.id)
    return b && it.quantity > (b.stock || 0)
  })
  if (stockErr) { ElMessage.warning(`「${stockErr.name}」库存不足，请调整数量`); return }

  submittingKey.value = group.seller
  const res = await orderStore.createOrder({
    address: addr.value,
    phone: phone.value,
    items: group.items.map((it) => ({ book_id: it.id, quantity: it.quantity })),
  })
  submittingKey.value = ''

  if (res.ok) {
    group.items.forEach((it) => cart.removeItem(it.id))
    ElMessage.success(`下单成功，订单号 ${res.order_no}，应付 ¥${res.total}`)
    if (!cart.items.length) router.push('/orders')
  } else {
    ElMessage.error(res.msg || '下单失败')
  }
}
</script>

<style scoped>
.page { min-height: 100vh; background: #f8fafc; }
.wrap { max-width: 1100px; margin: 0 auto; padding: 20px; }
.wrap h2 { font-size: 22px; color: #1e293b; margin: 0 0 18px; font-weight: 700; }
.sub { font-size: 14px; color: #94a3b8; font-weight: 400; }
.empty { padding: 60px 0; }
.addr-card { border-radius: 12px; margin-bottom: 16px; }
.addr { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.tip { font-size: 12px; color: #94a3b8; }
.thumb { width: 46px; height: 60px; border-radius: 6px; overflow: hidden; flex-shrink: 0; box-shadow: 0 2px 6px rgba(60,35,20,0.15); }
.group { border-radius: 12px; margin-bottom: 16px; }
.gh { display: flex; justify-content: space-between; align-items: center; font-size: 14px; }
.cnt { font-size: 12px; color: #94a3b8; }
.gf { display: flex; justify-content: flex-end; align-items: center; gap: 16px; padding: 12px 4px 2px; }
.tp { font-size: 22px; font-weight: 800; color: #ef4444; }
:deep(.el-card) { border: 1px solid #e2e8f0; }
:deep(.el-table th) { background: #f8fafc; color: #64748b; font-weight: 600; font-size: 12px; }
</style>
