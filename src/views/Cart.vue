<template>
  <div class="page">
    <NavHeader />
    <div class="wrap">
      <h2>购物车 <span class="sub">({{ cart.totalCount }}件)</span></h2>
      <div v-if="!cart.items.length" class="empty"><el-empty description="购物车空空如也" :image-size="120"><el-button type="primary" @click="$router.push('/books')">去逛逛</el-button></el-empty></div>
      <template v-else>
        <el-card shadow="never" class="cc"><el-table :data="cart.items"><el-table-column label="图书" min-width="300"><template #default="{ row: r }"><div style="display:flex;align-items:center;gap:12px"><span style="font-size:30px">{{r.cover}}</span><div><div style="font-weight:600">{{r.name}}</div><div style="font-size:12px;color:var(--text-muted)">{{r.author}} | {{r.condition_grade}}</div></div></div></template></el-table-column><el-table-column label="单价" width="100"><template #default="{ row: r }">¥{{r.price}}</template></el-table-column><el-table-column label="数量" width="130"><template #default="{ row: r }"><el-input-number v-model="r.quantity" :min="1" :max="99" size="small" @change="cart.updateQuantity(r.id,r.quantity)"/></template></el-table-column><el-table-column label="小计" width="100"><template #default="{ row: r }">¥{{(r.price*r.quantity).toFixed(2)}}</template></el-table-column><el-table-column label="操作" width="70"><template #default="{ row: r }"><el-button text type="danger" @click="cart.removeItem(r.id)">删除</el-button></template></el-table-column></el-table></el-card>
        <el-card shadow="never" class="bc"><div class="br"><div><el-input v-model="addr" placeholder="收货地址" size="small" style="width:200px"/><el-input v-model="phone" placeholder="联系电话" size="small" style="width:140px;margin-left:8px"/></div><div class="tr"><span>合计：</span><span class="tp">¥{{ cart.totalPrice.toFixed(2) }}</span><el-button type="primary" size="large" @click="submit" :loading="submitting" style="margin-left:16px">提交订单</el-button></div></div></el-card>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useCartStore } from '@/stores/cart'
import { useOrderStore } from '@/stores/order'
import { useAuthStore } from '@/stores/auth'
import { useBookStore } from '@/stores/book'
import NavHeader from '@/components/NavHeader.vue'
const cart = useCartStore(); const orderStore = useOrderStore(); const auth = useAuthStore(); const bookStore = useBookStore(); const router = useRouter()
const addr = ref(auth.user?.address||''); const phone = ref(auth.user?.phone||''); const submitting = ref(false)
async function submit() {
  if(!auth.isLoggedIn){ElMessage.warning('请先登录');router.push('/login');return}
  if(!addr.value||!phone.value){ElMessage.warning('请填写地址电话');return}
  // stock check
  try { await bookStore.fetchBooks() } catch {}
  const stockErr = cart.items.find(it => {
    const b = bookStore.books.find(x => x.id === it.id)
    return b && it.quantity > (b.stock || 0)
  })
  if (stockErr) { ElMessage.warning(`「${stockErr.name}」库存不足，请调整数量`); return }
  submitting.value = true
  const res = await orderStore.createOrder({user_id:auth.user?.id, user_name:auth.userName, total:cart.totalPrice, address:addr.value, phone:phone.value, items:cart.items})
  if(res.ok){ cart.items.forEach(it => { const b = bookStore.books.find(x => x.id === it.id); if (b) b.sales = (b.sales||0) + it.quantity }); cart.clear(); ElMessage.success('下单成功！订单号：'+res.order_no); router.push('/orders') }
  else ElMessage.error(res.msg||'下单失败')
  submitting.value = false
}
</script>

<style scoped>
.page { min-height: 100vh; background: #f8fafc; }
.wrap { max-width: 1100px; margin: 0 auto; padding: 20px; }
.wrap h2 { font-size: 22px; color: #1e293b; margin: 0 0 18px; font-weight: 700; }
.sub { font-size: 14px; color: #94a3b8; font-weight: 400; }
.empty { padding: 60px 0; }
:deep(.el-card) { border-radius: 12px; border: 1px solid #e2e8f0; }
:deep(.el-table th) { background: #f8fafc; color: #64748b; font-weight: 600; font-size: 12px; }
.cc { border-radius: 12px 12px 0 0 !important; }
.bc {
  border-radius: 0 0 12px 12px !important; border-top: none;
  background: linear-gradient(180deg, #fff, #fdf6ec);
}
.br { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; padding: 4px 0; }
.tr { display: flex; align-items: center; font-size: 16px; }
.tp { font-size: 28px; font-weight: 800; color: #ef4444; text-shadow: 0 1px 2px rgba(239,68,68,0.1); }
</style>
