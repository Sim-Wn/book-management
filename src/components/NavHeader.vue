<template>
  <el-header class="nav">
    <div class="nav-inner">
      <div class="nav-left">
        <span class="back-btn" @click="router.push('/home')" title="返回首页">← 首页</span>
        <router-link to="/home" class="logo">
          <img src="/logo.svg" class="logo-img" alt="书易" /><span>书易</span>
        </router-link>
        <el-menu mode="horizontal" class="nav-menu" :ellipsis="false" :default-active="activeMenu">
          <el-menu-item index="/home" @click="router.push('/home')">首页</el-menu-item>
          <el-menu-item index="/books" @click="router.push('/books')">全部图书</el-menu-item>
          <el-menu-item index="/sell" @click="router.push('/sell')">上架图书</el-menu-item>
          <el-menu-item index="/forum" @click="router.push('/forum')">论坛</el-menu-item>
          <el-menu-item index="/archive" @click="router.push('/archive')">图书档案</el-menu-item>
        </el-menu>
      </div>
      <div class="nav-right">
        <el-input v-model="kw" placeholder="搜索图书..." size="small" class="search" @keyup.enter="doSearch" clearable>
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <router-link to="/swaps" class="ico"><el-badge :value="swapBadge" :hidden="!swapBadge" :max="99"><el-icon size="18"><Sort /></el-icon></el-badge></router-link>
        <router-link to="/messages" class="ico"><el-badge :value="msgBadge" :hidden="!msgBadge" :max="99"><el-icon size="18"><ChatDotRound /></el-icon></el-badge></router-link>
        <router-link to="/favorites" class="ico"><el-icon size="18"><Star /></el-icon></router-link>
        <router-link to="/cart" class="ico cart-ico">
          <el-badge :value="cart.totalCount" :hidden="!cart.totalCount" :max="99"><el-icon size="18"><ShoppingCart /></el-icon></el-badge>
        </router-link>
        <RealtimeClock />
        <template v-if="auth.isLoggedIn">
          <el-dropdown>
            <span class="user-tag"><el-icon><User /></el-icon>{{ auth.userName }}</span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="$router.push('/profile')">个人中心</el-dropdown-item>
                <el-dropdown-item @click="$router.push('/my-books')">我的发布</el-dropdown-item>
                <el-dropdown-item @click="$router.push('/orders')">我的订单</el-dropdown-item>
                <el-dropdown-item @click="$router.push('/messages')">我的私信</el-dropdown-item>
                <el-dropdown-item divided @click="auth.logout(); $router.push('/')">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </template>
        <template v-else>
          <el-button type="primary" size="small" @click="$router.push('/login')">登录</el-button>
          <el-button size="small" @click="$router.push('/register')">注册</el-button>
        </template>
      </div>
    </div>
  </el-header>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import { api } from '@/api'
import RealtimeClock from '@/components/RealtimeClock.vue'
const auth = useAuthStore(); const cart = useCartStore(); const router = useRouter(); const route = useRoute()
const kw = ref(''); const swapBadge = ref(0); const msgBadge = ref(0)
const activeMenu = computed(() => {
  const p = route.path
  if (p.startsWith('/home')) return '/home'
  if (p.startsWith('/books')) return '/books'
  if (p.startsWith('/sell')) return '/sell'
  if (p.startsWith('/forum')) return '/forum'
  if (p.startsWith('/archive')) return '/archive'
  return p
})
function doSearch() { if (kw.value.trim()) { router.push({ path: '/books', query: { q: kw.value.trim() } }); kw.value = '' } }

async function updateBadges() {
  if (!auth.isLoggedIn) { swapBadge.value = 0; msgBadge.value = 0; return }
  try {
    const swaps = await api.getSwaps(auth.user.id)
    if (Array.isArray(swaps)) swapBadge.value = swaps.filter(s => s.status === '待确认').length
  } catch {}
  try {
    const convs = await api.getConversations(auth.user.id)
    if (Array.isArray(convs)) msgBadge.value = convs.reduce((s, c) => s + (Number(c.unread_count) || 0), 0)
  } catch {}
}

watch(() => auth.isLoggedIn, () => updateBadges())
onMounted(() => updateBadges())
</script>

<style scoped>
.nav {
  background: linear-gradient(90deg, #fff, #fdf8f2, #faf0e6, #fdf8f2, #fff);
  background-size: 200% 100%; animation: navShine 15s ease infinite;
  border-bottom: 1px solid var(--border); padding: 0; height: 54px;
  box-shadow: 0 1px 8px rgba(0,0,0,0.04); position: sticky; top: 0; z-index: 100;
}
@keyframes navShine { 0%,100% { background-position: 0% 50% } 50% { background-position: 100% 50% } }
.nav-inner { max-width: 1300px; margin: 0 auto; height: 100%; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; }
.nav-left { display: flex; align-items: center; }
.back-btn { cursor: pointer; color: var(--text-secondary); font-size: 13px; padding: 4px 8px; margin-right: 4px; border-radius: 4px; transition: all .2s; user-select: none; }
.back-btn:hover { color: var(--primary); background: rgba(139,96,64,0.06); }
.logo { display: flex; align-items: center; gap: 6px; text-decoration: none; color: var(--text); font-size: 18px; font-weight: 700; margin-right: 12px; }
.logo-img { width: 30px; height: 30px; flex-shrink: 0; }
.nav-menu { border-bottom: none !important; height: 54px; }
:deep(.nav-menu .el-menu-item) { height: 54px; line-height: 54px; font-size: 14px; color: var(--text-secondary); transition: color 0.2s; }
:deep(.nav-menu .el-menu-item:hover) { color: var(--primary) !important; }
:deep(.nav-menu .el-menu-item.is-active) { color: var(--primary) !important; border-bottom: 2px solid var(--primary) !important; font-weight: 600; }
.nav-right { display: flex; align-items: center; gap: 14px; }
.search { width: 190px; }
.ico { color: var(--text-secondary); display: flex; align-items: center; text-decoration: none; transition: color 0.2s; }
.ico:hover { color: var(--primary); }
.cart-ico { margin-right: -2px; }
.user-tag { display: flex; align-items: center; gap: 4px; cursor: pointer; font-size: 13px; color: var(--text); font-weight: 500; }
</style>
