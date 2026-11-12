<template>
  <div class="portal">
    <div class="orb o1"></div><div class="orb o2"></div><div class="orb o3"></div>
    <div class="wrap">
      <div class="head">
        <div class="brand"><img src="/logo.svg" class="brand-logo" /><h1>书 易</h1></div>
        <p>校园二手图书交易平台 · 让知识循环流动</p>
      </div>
      <div class="cards">
        <div class="entry" @click="$router.push('/login')">
          <div class="eicon uic"><el-icon size="28"><UserFilled /></el-icon></div>
          <h2>用户端</h2>
          <ul><li>浏览海量二手好书</li><li>上架出售闲置书籍</li><li>购物车下单轻松买书</li></ul>
          <span class="btn">进入用户端 →</span>
        </div>
        <div class="entry" @click="$router.push('/admin/login')">
          <div class="eicon aic"><el-icon size="28"><Setting /></el-icon></div>
          <h2>管理端</h2>
          <ul><li>图书审核与上下架</li><li>订单处理与物流追踪</li><li>用户管理与数据统计</li></ul>
          <span class="btn">进入管理端 →</span>
        </div>
      </div>
      <p class="foot">© 2025 书易 Shuyi</p>
    </div>
  </div>
</template>
<style scoped>
.portal{min-height:100vh;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;background:linear-gradient(-30deg,#3a1c0e,#5c3424,#3a1c0e,#6b4030,#3a1c0e);background-size:300% 300%;animation:g 20s ease infinite}
@keyframes g{0%{background-position:0% 50%}50%{background-position:100% 100%}100%{background-position:0% 50%}}
.orb{position:absolute;border-radius:50%;filter:blur(90px);pointer-events:none;opacity:0.15}
.o1{width:480px;height:480px;background:#c08848;top:-160px;right:-80px;animation:f1 14s ease-in-out infinite}
.o2{width:380px;height:380px;background:#8b6040;bottom:-120px;left:-60px;animation:f2 12s ease-in-out infinite}
.o3{width:280px;height:280px;background:#d4a060;top:55%;left:60%;opacity:0.12;animation:f3 16s ease-in-out infinite}
@keyframes f1{0%,100%{transform:translate(0,0)}50%{transform:translate(30px,-20px)}}
@keyframes f2{0%,100%{transform:translate(0,0)}50%{transform:translate(-25px,20px)}}
@keyframes f3{0%,100%{transform:translate(0,0)}50%{transform:translate(20px,25px)}}
.wrap{position:relative;z-index:1;text-align:center;padding:40px 20px;max-width:780px}
.head{margin-bottom:48px}
.brand{display:flex;align-items:center;justify-content:center;gap:10px}
.brand-logo{width:52px;height:52px;flex-shrink:0;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.3))}
.brand h1{font-size:46px;color:#fff;margin:0;font-weight:800;letter-spacing:8px;text-shadow:0 2px 12px rgba(0,0,0,0.25)}
.head p{color:rgba(255,255,255,0.4);font-size:14px;margin:12px 0 0;letter-spacing:2px}
.cards{display:flex;gap:24px;justify-content:center;flex-wrap:wrap}
.entry{width:280px;padding:36px 24px;border-radius:18px;cursor:pointer;transition:all 0.35s ease;text-align:center;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.05);backdrop-filter:blur(12px)}
.entry:hover{transform:translateY(-8px);background:rgba(255,255,255,0.12);border-color:rgba(255,255,255,0.18);box-shadow:0 20px 60px rgba(0,0,0,0.3)}
.eicon{width:60px;height:60px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px}
.uic{background:linear-gradient(135deg,#8b6040,#c08848);color:#fff;box-shadow:0 4px 16px rgba(139,96,64,0.4)}
.aic{background:linear-gradient(135deg,#4a2a15,#6b4030);color:#c08848;box-shadow:0 4px 16px rgba(74,42,21,0.4)}
.entry h2{color:#fff;font-size:20px;margin:0 0 12px;font-weight:700}
.entry ul{list-style:none;padding:0;margin:0 0 20px}
.entry ul li{color:rgba(255,255,255,0.4);font-size:13px;padding:4px 0}
.btn{color:rgba(255,255,255,0.6);font-size:14px;font-weight:600}
.entry:hover .btn{color:#c08848}
.foot{margin-top:52px;color:rgba(255,255,255,0.12);font-size:12px}
</style>
