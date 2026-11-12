<template>
  <div class="page">
    <NavHeader />
    <div class="wrap" v-if="book">
      <el-breadcrumb separator=">" class="bread"><el-breadcrumb-item :to="{path:'/home'}">首页</el-breadcrumb-item><el-breadcrumb-item :to="{path:'/books'}">全部图书</el-breadcrumb-item><el-breadcrumb-item>{{ book.name }}</el-breadcrumb-item></el-breadcrumb>
      <div class="detail">
        <div class="cover">
          <img v-if="book.cover_url" :src="book.cover_url" class="cover-img" @error="e=>{e.target.style.display='none';imgErr=true}" />
          <span v-show="!book.cover_url || imgErr" class="emoji">{{ book.cover }}</span>
          <el-tag type="warning" effect="dark" size="small" class="ctag">{{ book.condition_grade }}</el-tag>
        </div>
        <div class="info">
          <div class="ih"><h2>{{ book.name }}</h2><el-button v-if="auth.isLoggedIn" :class="{on:isFav}" circle @click="tFav"><el-icon size="18"><Star /></el-icon></el-button></div>
          <p class="author">作者：{{ book.author }} | 分类：{{ book.category }} | 成色：{{ book.condition_grade }}</p>
          <div class="pr"><span class="p">¥{{ book.price }}</span><span class="o">¥{{ book.original_price || book.originalPrice }}</span><el-tag size="small" :type="book.status==='在售'?'success':'info'">{{ book.status }}</el-tag></div>
          <p class="desc">{{ book.description }}</p>
          <div class="extra"><span>库存：{{ book.stock }}</span><span>已售：{{ book.sales || 0 }}</span></div>
          <div class="rating-row">
            <div class="stars-display">
              <span v-for="s in 5" :key="s" class="star" :class="{ filled: s <= Math.round(ratingInfo.rating) }">★</span>
              <span class="rating-num">{{ ratingInfo.rating || '暂无' }}</span>
              <span class="rating-cnt" v-if="ratingInfo.count">({{ ratingInfo.count }}人评分)</span>
            </div>
            <div v-if="auth.isLoggedIn" class="stars-input">
              <span v-for="s in 5" :key="'m'+s" class="star my-star" :class="{ filled: s <= myScore, hover: s <= hoverScore }" @click="rateBook(s)" @mouseenter="hoverScore=s" @mouseleave="hoverScore=0">★</span>
              <span v-if="myScore" class="my-label">我的评分: {{ myScore }}分</span>
            </div>
          </div>
          <div class="seller"><span>卖家：{{ book.seller_name }}</span><el-button v-if="book.seller_id && auth.user?.id !== book.seller_id" text size="small" type="primary" @click="$router.push('/messages/'+book.seller_id)" class="pm-btn">💬 私信</el-button><span>上架：{{ book.listed_at || book.listedAt }}</span></div>
          <div class="acts" v-if="book.status==='在售'"><el-button type="primary" size="large" @click="addCart">加入购物车</el-button><el-button size="large" @click="openBuyDlg">立即购买</el-button><el-button size="large" @click="showSwapDlg=true" class="swap-btn">🔄 发起交换</el-button></div>
          <el-tag v-else type="info" size="large">{{ book.status==='已交换'?'该图书已被交换':book.status==='已售罄'?'该图书已售罄':'该图书已下架' }}</el-tag>
        </div>
      </div>
    </div>
    <div class="wrap" v-else-if="!loading"><el-empty description="图书未找到" :image-size="120"><el-button type="primary" @click="$router.push('/books')">返回图书列表</el-button></el-empty></div>
    <div class="wrap" v-if="book && related.length">
      <div class="sec-head"><h2>📚 相关推荐</h2></div>
      <el-row :gutter="16"><el-col v-for="b in related" :key="b.id" :xs="12" :sm="8" :md="6" :lg="4" style="margin-bottom:16px"><BookCard :book="b"/></el-col></el-row>
    </div>
  </div>
  <el-dialog v-model="showSwapDlg" title="发起图书交换" width="480px" destroy-on-close>
    <div class="swap-dlg">
      <p class="swap-hint">选择你上架的一本书与 <strong>{{ book?.name }}</strong> 进行交换</p>
      <el-select v-model="swapBookId" placeholder="请选择你要交换的书" filterable style="width:100%" size="large">
        <el-option v-for="b in myBooks" :key="b.id" :label="b.name + ' - ¥' + b.price" :value="b.id">
          <span>{{ b.name }}</span><span style="float:right;color:var(--text-muted)">¥{{ b.price }}</span>
        </el-option>
      </el-select>
      <el-empty v-if="!myBooks.length" :image-size="40" description="你还没有上架的图书，先去上架吧"/>
    </div>
    <template #footer>
      <el-button @click="showSwapDlg=false">取消</el-button>
      <el-button type="primary" @click="doSwap" :disabled="!swapBookId">发起交换请求</el-button>
    </template>
  </el-dialog>
  <el-dialog v-model="buyDlg.vis" title="确认下单" width="420px" destroy-on-close>
    <div class="buy-dlg">
      <p class="buy-info">《{{ book?.name }}》 ×1 — <strong>¥{{ book?.price }}</strong></p>
      <el-input v-model="buyDlg.addr" placeholder="收货地址" size="large" style="margin-bottom:12px"/>
      <el-input v-model="buyDlg.phone" placeholder="联系电话" size="large"/>
    </div>
    <template #footer>
      <el-button @click="buyDlg.vis=false">取消</el-button>
      <el-button type="primary" @click="doBuyNow" :loading="buyDlg.loading">确认下单</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useBookStore } from '@/stores/book'
import { useCartStore } from '@/stores/cart'
import { useAuthStore } from '@/stores/auth'
import { useSwapStore } from '@/stores/swap'
import { useOrderStore } from '@/stores/order'
import { api } from '@/api'
import NavHeader from '@/components/NavHeader.vue'
import BookCard from '@/components/BookCard.vue'
const route = useRoute(); const router = useRouter(); const bookStore = useBookStore(); const cart = useCartStore(); const auth = useAuthStore(); const swapStore = useSwapStore(); const orderStore = useOrderStore()
const book = ref(null); const isFav = ref(false); const loading = ref(true); const imgErr = ref(false)
const ratingInfo = ref({ rating: 0, count: 0, mine: null })
const myScore = ref(0); const hoverScore = ref(0)
const showSwapDlg = ref(false); const swapBookId = ref(null); const myBooks = ref([])
const buyDlg = reactive({ vis: false, addr: '', phone: '', loading: false })
onMounted(async ()=>{
  loading.value = true
  try { book.value = await api.getBook(route.params.id) } catch { book.value = bookStore.getBook(route.params.id) }
  if (auth.isLoggedIn) { await auth.loadFavorites(); isFav.value = auth.isFavorite(book.value?.id) }
  try {
    const r = await api.getRating(route.params.id, auth.user?.id)
    ratingInfo.value = r
    myScore.value = r.mine || 0
  } catch {}
  if (auth.isLoggedIn) {
    const all = bookStore.getUserBooks(auth.userName)
    myBooks.value = all.filter(b => b.status === '在售' && b.id !== book.value?.id)
  }
  loading.value = false
})
async function tFav() {
  const added = await auth.toggleFavorite(book.value.id)
  isFav.value = added
  ElMessage({ message: added ? '已收藏' : '取消收藏', type: 'success', duration: 1000, showClose: false })
}
function addCart() { cart.addItem(book.value); ElMessage.success('已加入购物车') }
function openBuyDlg() { if(!auth.isLoggedIn){ElMessage.warning('请先登录');router.push('/login');return}; buyDlg.addr = auth.user?.address || ''; buyDlg.phone = auth.user?.phone || ''; buyDlg.vis = true }
async function doBuyNow() {
  if(!buyDlg.addr||!buyDlg.phone){ElMessage.warning('请填写地址和电话');return}
  buyDlg.loading = true
  const res = await orderStore.createOrder({user_id:auth.user.id, user_name:auth.userName, total:book.value.price, address:buyDlg.addr, phone:buyDlg.phone, items:[{...book.value, quantity:1}]})
  buyDlg.loading = false
  if(res.ok){buyDlg.vis=false;ElMessage.success('下单成功！');router.push('/orders')}
  else ElMessage.error(res.msg||'下单失败')
}
const related = computed(() => {
  if (!book.value || !bookStore.books.length) return []
  return bookStore.books.filter(b => b.category === book.value.category && b.id !== book.value.id && b.status === '在售').sort((a,b)=>(b.sales||0)-(a.sales||0)).slice(0,6)
})
async function rateBook(score) {
  if (!auth.isLoggedIn) { ElMessage.warning('请先登录'); router.push('/login'); return }
  try {
    const r = await api.rateBook(book.value.id, { user_id: auth.user.id, score })
    myScore.value = score
    ratingInfo.value.rating = r.rating
    ratingInfo.value.mine = score
    if (!ratingInfo.value.count) ratingInfo.value.count = 1
    ElMessage.success('评分成功')
  } catch { ElMessage.error('评分失败') }
}
async function doSwap() {
  if (!auth.isLoggedIn) { ElMessage.warning('请先登录'); return }
  const toBook = myBooks.value.find(b => b.id === swapBookId.value)
  if (!toBook) return
  try {
    const res = await swapStore.createSwap({
      from_user_id: auth.user.id,
      from_book_id: toBook.id,
      from_book_name: toBook.name,
      to_user_id: book.value.seller_id,
      to_book_id: book.value.id,
      to_book_name: book.value.name
    })
    if (res.ok) {
      ElMessage.success('交换请求已发送')
      showSwapDlg.value = false
      swapBookId.value = null
    } else {
      ElMessage.error(res.msg || '发起失败')
    }
  } catch { ElMessage.error('发起失败') }
}
</script>

<style scoped>
.page { min-height: 100vh; background: var(--bg); }
.wrap { max-width: 1100px; margin: 0 auto; padding: 16px 20px; }
.bread { margin-bottom: 16px; }
.detail { display: flex; gap: 28px; background: #fff; border-radius: var(--radius); padding: 24px; box-shadow: var(--shadow); }
.cover {
  width: 320px; height: 360px; background: linear-gradient(145deg, #f5f3fa, #ede9fe);
  display: flex; align-items: center; justify-content: center; border-radius: 10px;
  flex-shrink: 0; position: relative; overflow: hidden;
}
.cover-img { width: 100%; height: 100%; object-fit: cover; }
.emoji { font-size: 96px; }
.ctag { position: absolute; top: 12px; left: 12px; }
.info { flex: 1; }
.ih { display: flex; align-items: center; gap: 10px; }
.ih h2 { margin: 0; font-size: 22px; color: var(--text); }
.on { color: var(--primary); border-color: var(--primary); }
.author { color: var(--text-muted); font-size: 13px; margin: 8px 0 16px; }
.pr { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
.p { font-size: 30px; font-weight: 700; color: var(--danger); }
.o { font-size: 14px; color: var(--text-muted); text-decoration: line-through; }
.desc { color: var(--text-secondary); line-height: 1.8; margin-bottom: 16px; font-size: 14px; }
.extra { display: flex; gap: 24px; color: var(--text-muted); font-size: 13px; margin-bottom: 10px; }
.rating-row { margin-bottom: 16px; padding: 12px 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
.stars-display { display: flex; align-items: center; gap: 4px; margin-bottom: 8px; }
.stars-input { display: flex; align-items: center; gap: 4px; }
.star { font-size: 22px; color: #ddd; transition: color 0.15s; }
.star.filled { color: #f59e0b; }
.my-star { cursor: pointer; font-size: 20px; }
.my-star:hover, .my-star.hover { color: #f59e0b; transform: scale(1.15); }
.rating-num { font-size: 14px; color: var(--text); font-weight: 600; margin-left: 6px; }
.rating-cnt { font-size: 12px; color: var(--text-muted); margin-left: 4px; }
.my-label { font-size: 12px; color: var(--primary); margin-left: 8px; font-weight: 500; }
.seller { background: var(--bg); padding: 10px 14px; border-radius: 8px; display: flex; gap: 24px; align-items: center; font-size: 13px; color: var(--text-secondary); margin-bottom: 20px; }
.pm-btn { margin-left: -12px; }
.acts { display: flex; gap: 12px; }
.swap-btn { border-color: var(--accent); color: var(--accent); }
.swap-btn:hover { border-color: var(--primary); color: var(--primary); background: var(--primary-light); }
.swap-dlg { padding: 10px 0; }
.swap-hint { color: var(--text-secondary); margin-bottom: 16px; font-size: 14px; }
.buy-dlg { padding: 10px 0; }
.buy-info { font-size: 15px; color: var(--text); margin-bottom: 16px; }
.sec-head { margin-bottom: 14px; }
.sec-head h2 { margin: 0; font-size: 20px; color: var(--text); font-weight: 700; }
@media (max-width:768px){.detail{flex-direction:column}.cover{width:100%;height:240px}}
</style>
