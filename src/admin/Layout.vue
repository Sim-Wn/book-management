<template>
  <div class="layout">
    <aside :class="['sidebar', { collapsed }]">
      <div class="logo-area">
        <div class="logo" @click="$router.push('/')">
          <img src="/logo.svg" class="logo-img" />
          <span v-show="!collapsed" class="logo-text">书易后台</span>
        </div>
        <div class="logo-ornament" v-show="!collapsed"><span></span><span class="lo-dot">◆</span><span></span></div>
        <div class="logo-sub" v-show="!collapsed">管理控制面板</div>
      </div>
      <nav class="sidenav">
        <div class="nav-label" v-show="!collapsed">导航菜单</div>
        <div v-for="m in menus" :key="m.path" :class="['nav-item', { active: route.path === m.path }]" @click="go(m.path)">
          <span class="ni">{{ m.icon }}</span><span v-show="!collapsed" class="nt">{{ m.label }}</span>
        </div>
      </nav>
      <div class="sb">
        <div class="user-badge" v-show="!collapsed">
          <div class="ub-avatar">A</div>
          <div class="ub-info">
            <div class="ub-name">管理员</div>
            <div class="ub-role">超级管理员</div>
          </div>
        </div>
        <div class="nav-item logout" @click="logout"><span class="ni">🚪</span><span v-show="!collapsed" class="nt">退出登录</span></div>
      </div>
    </aside>
    <div class="mainarea">
      <header class="topbar"><span class="back-btn" @click="router.push('/admin/dashboard')" title="返回控制台">← 控制台</span><span class="toggle" @click="collapsed=!collapsed" :title="collapsed?'展开侧栏':'收起侧栏'">{{ collapsed ? '▶' : '◀' }}</span><span class="tt">书易管理后台</span><RealtimeClock class="topbar-clock" /><span class="tu">admin</span></header>
      <main class="content"><router-view /></main>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'; import { useRouter, useRoute } from 'vue-router'; import { useAuthStore } from '@/stores/auth'
import RealtimeClock from '@/components/RealtimeClock.vue'
const auth = useAuthStore(); const router = useRouter(); const route = useRoute(); const collapsed = ref(false)
const menus=[
  {path:'/admin/dashboard',label:'控制台',icon:'📊'},
  {path:'/admin/books',label:'图书管理',icon:'📚'},
  {path:'/admin/orders',label:'订单管理',icon:'📋'},
  {path:'/admin/users',label:'用户管理',icon:'👥'},
  {path:'/admin/categories',label:'分类管理',icon:'🏷️'},
  {path:'/admin/messages',label:'消息管理',icon:'💬'},
  {path:'/admin/swaps',label:'交换管理',icon:'🔄'},
  {path:'/admin/sales',label:'销售统计',icon:'💰'},
]
function go(p){if(route.path!==p)router.push(p)}
function logout(){auth.logout();router.push('/admin/login')}
</script>

<style scoped>
.layout{height:100vh;display:flex}

/* === Sidebar === */
.sidebar{
  width:210px;display:flex;flex-direction:column;flex-shrink:0;transition:width 0.2s ease;overflow:hidden;
  background:linear-gradient(180deg,#362418,#4a3424,#3d2a1c);
  position:relative;
}
.sidebar::after{
  content:'';position:absolute;top:0;right:0;bottom:0;width:1px;
  background:linear-gradient(180deg,transparent,rgba(192,152,104,0.2),transparent);
}
.sidebar.collapsed{width:56px}

/* === Logo Area === */
.logo-area{flex-shrink:0;padding:16px 0 8px;text-align:center}
.logo{
  display:flex;align-items:center;justify-content:center;gap:8px;
  color:#d4b880;font-size:17px;font-weight:700;cursor:pointer;user-select:none;
  letter-spacing:3px;
}
.logo-img{width:32px;height:32px;flex-shrink:0;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.3))}
.logo-text{background:linear-gradient(180deg,#e0c898,#c09868);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.logo-ornament{display:flex;align-items:center;justify-content:center;gap:8px;margin:8px auto 0;width:100px}
.logo-ornament span:first-child,.logo-ornament span:last-child{flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(192,152,104,0.4),transparent)}
.lo-dot{color:#c09868;font-size:6px;position:relative;top:-1px}
.logo-sub{font-size:11px;color:rgba(255,255,255,0.2);margin-top:4px;letter-spacing:3px;text-transform:uppercase}
.collapsed .logo-area{padding:14px 0 8px}

/* Nav label */
.nav-label{font-size:10px;color:rgba(255,255,255,0.15);padding:6px 16px 4px;letter-spacing:2px;text-transform:uppercase}

/* Nav */
.sidenav{flex:1;padding:8px 8px 4px;overflow-y:auto}
.nav-item{
  position:relative;display:flex;align-items:center;gap:10px;padding:0 14px;height:38px;margin:1px 0;
  border-radius:8px;cursor:pointer;transition:all 0.2s;user-select:none;color:#a08878;
}
.collapsed .nav-item{justify-content:center;padding:0}
.nav-item:hover{background:rgba(192,152,104,0.1);color:#d4b880}
.nav-item.active{background:rgba(192,152,104,0.18);color:#e0c898;font-weight:600}
.nav-item.active::before{content:'';position:absolute;left:0;top:8px;bottom:8px;width:3px;background:#c09868;border-radius:0 3px 3px 0}
.ni{font-size:16px;flex-shrink:0;width:24px;text-align:center}
.nt{font-size:13px;white-space:nowrap;font-weight:500}

/* === Bottom Area === */
.sb{flex-shrink:0;margin-top:auto;padding:8px;border-top:1px solid rgba(255,255,255,0.06)}
.user-badge{display:flex;align-items:center;gap:10px;padding:8px 10px;margin-bottom:4px;border-radius:10px;background:rgba(192,152,104,0.08)}
.ub-avatar{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#8b6040,#c09868);color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;flex-shrink:0}
.ub-name{font-size:13px;color:#c09868;font-weight:600}
.ub-role{font-size:11px;color:rgba(255,255,255,0.25);margin-top:1px}
.sb .logout{height:36px;margin:0;color:#807060}
.sb .logout:hover{background:rgba(200,80,60,0.15);color:#e09080}
.collapsed .sb{padding:6px 4px;display:flex;flex-direction:column;align-items:center}

/* === Main Area === */
.mainarea{flex:1;display:flex;flex-direction:column;min-width:0;background:#faf8f4}

/* Topbar */
.topbar{
  height:44px;background:#fff;border-bottom:1px solid #e8e0d5;display:flex;align-items:center;gap:10px;
  padding:0 16px;flex-shrink:0;
}
.back-btn{
  cursor:pointer;font-size:12px;color:#8b6040;user-select:none;
  padding:4px 10px;border-radius:5px;transition:all 0.2s;font-weight:500;
}
.back-btn:hover{color:#5a3a20;background:#fdf8f2}
.toggle{
  cursor:pointer;font-size:16px;color:#a09080;user-select:none;width:28px;height:28px;
  display:flex;align-items:center;justify-content:center;border-radius:5px;transition:all 0.2s;
  margin-left:4px;
}
.toggle:hover{color:#8b6040;background:#fdf8f2}
.tt{font-weight:700;color:#3a2518;font-size:14px}
.tu{margin-left:auto;font-size:12px;color:#a09080;background:#f5f0e8;padding:3px 10px;border-radius:12px}
.topbar-clock { margin: 0 auto; }

/* Content */
.content{flex:1;padding:18px;overflow:auto;background:#faf8f4}

@media(max-width:768px){
  .sidebar{width:56px!important}
  .content{padding:10px}
  .tt,.topbar-clock{display:none}
  .topbar{padding:0 10px;gap:6px}
  .back-btn{padding:4px 6px}
}
</style>
