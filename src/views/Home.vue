<template>
<div>
  <NavHeader />
  <section class="hero">
    <div class="hero-bg">
      <div class="hb h1"></div><div class="hb h2"></div><div class="hb h3"></div><div class="hb h4"></div>
    </div>
    <div class="hero-inner">
      <span class="hero-kv">— 书香易卷 · 知识流转 —</span>
      <h1>让每一本书<span class="hl">遇见</span>下一个读者</h1>
      <p>买得实惠，卖得省心 — 校园二手图书循环交易平台</p>
      <div class="hero-search">
        <el-input v-model="kw" size="large" placeholder="搜索书名、作者、分类..." @keyup.enter="goSearch" clearable class="hs">
          <template #prefix><el-icon size="18"><Search /></el-icon></template>
          <template #append><el-button type="primary" @click="goSearch" class="hsb">搜 索</el-button></template>
        </el-input>
      </div>
      <div class="hero-stats">
        <div class="hs"><strong>{{ stats.booksOnSale }}</strong><span>在售图书</span></div>
        <div class="hs"><strong>{{ stats.categories }}</strong><span>图书分类</span></div>
        <div class="hs"><strong>{{ stats.users }}</strong><span>注册用户</span></div>
      </div>
    </div>
  </section>
  <section class="sec">
    <div class="sec-head"><h2>📂 图书分类</h2><router-link to="/books" class="more">查看全部 →</router-link></div>
    <div class="cats" v-if="bookStore.categories.length">
      <div v-for="c in bookStore.categories" :key="c" class="cat" @click="$router.push({path:'/books',query:{cat:c}})">{{c}}</div>
    </div>
    <el-empty v-else description="暂无分类" :image-size="60"/>
  </section>
  <section class="sec">
    <div class="sec-head"><h2>🔥 热门图书</h2><router-link to="/books" class="more">查看全部 →</router-link></div>
    <el-row :gutter="16" v-if="hot.length"><el-col v-for="b in hot" :key="b.id" :xs="12" :sm="8" :md="6" :lg="4" style="margin-bottom:16px"><BookCard :book="b"/></el-col></el-row>
    <el-empty v-else-if="!loading" description="暂无图书" :image-size="80"/>
  </section>
  <section class="sec">
    <div class="sec-head"><h2>🆕 最新上架</h2></div>
    <el-row :gutter="16" v-if="latest.length"><el-col v-for="b in latest" :key="b.id" :xs="12" :sm="8" :md="6" :lg="4" style="margin-bottom:16px"><BookCard :book="b"/></el-col></el-row>
  </section>
  <footer class="ft">
    <p>© {{ new Date().getFullYear() }} 书易 Shuyi · Vue3 + Element Plus + Express + MySQL</p>
    <p class="fp">"书中自有黄金屋，书中自有颜如玉"</p>
  </footer>
</div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBookStore } from '@/stores/book'
import { api } from '@/api'
import NavHeader from '@/components/NavHeader.vue'
import BookCard from '@/components/BookCard.vue'
const router = useRouter(); const bookStore = useBookStore()
const kw = ref(''); const loading = ref(true)
const stats = ref({ booksOnSale: 0, categories: 0, users: 0 })
const books = computed(()=>Array.isArray(bookStore.books)?bookStore.books.filter(b=>b.status==='在售'):[])
const hot = computed(()=>[...books.value].sort((a,b)=>(b.sales||0)-(a.sales||0)).slice(0,12))
const latest = computed(()=>[...books.value].sort((a,b)=>(b.id||0)-(a.id||0)).slice(0,6))
function goSearch(){if(kw.value.trim()){router.push({path:'/books',query:{q:kw.value.trim()}});kw.value=''}}
onMounted(async()=>{loading.value=true;await bookStore.fetchBooks();await bookStore.fetchCategories();try{Object.assign(stats.value, await api.getStats())}catch{};loading.value=false})
</script>

<style scoped>
.hero {
  position:relative;  padding:60px 20px 50px;text-align:center;color:#fff;
  background:linear-gradient(160deg,#4a3020 0%,#6b4c38 40%,#8b6c50 70%,#a08068 100%);
  overflow:hidden;
}
.hero-bg{position:absolute;inset:0;pointer-events:none}
.hb{position:absolute;border-radius:50%;filter:blur(70px);opacity:0.18}
.h1{width:450px;height:450px;background:#D4943A;top:-180px;right:-80px;animation:drift 10s ease-in-out infinite}
.h2{width:350px;height:350px;background:#8B4513;bottom:-120px;left:-60px;opacity:0.12;animation:drift 8s ease-in-out infinite reverse}
.h3{width:280px;height:280px;background:#5C2E16;top:50%;left:60%;animation:drift 12s ease-in-out infinite 3s}
.h4{width:200px;height:200px;background:#A0522D;bottom:20%;right:20%;opacity:0.25;animation:drift 7s ease-in-out infinite 1s}
@keyframes drift{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(30px,-20px) scale(1.1)}}
.hero-inner{position:relative;z-index:1;max-width:700px;margin:0 auto}
.hero-kv{display:inline-block;color:rgba(255,255,255,0.45);font-size:13px;letter-spacing:5px;margin-bottom:18px}
.hero h1{font-size:38px;margin:0 0 10px;font-weight:800;letter-spacing:2px;line-height:1.2}
.hero h1 .hl{color:#D4943A}
.hero p{color:rgba(255,255,255,0.55);margin:0 0 34px;font-size:16px}
.hero-search{margin-bottom:34px}
.hs :deep(.el-input__wrapper){background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);backdrop-filter:blur(8px);box-shadow:none;border-radius:10px}
.hs :deep(.el-input__wrapper:hover){border-color:rgba(255,255,255,0.3)}
.hs :deep(.el-input__inner){color:#fff}
.hs :deep(.el-input__inner::placeholder){color:rgba(255,255,255,0.35)}
.hs :deep(.el-input__prefix){color:rgba(255,255,255,0.45)}
.hsb{border-radius:0 10px 10px 0}
.hero-stats{display:flex;justify-content:center;gap:50px;flex-wrap:wrap}
.hs{text-align:center}
.hs strong{display:block;font-size:30px;font-weight:800;color:#D4943A}
.hs span{font-size:13px;color:rgba(255,255,255,0.5);display:block;margin-top:4px}
.sec{max-width:1300px;margin:0 auto;padding:24px 20px}
.sec-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
.sec-head h2{font-size:20px;color:var(--text);margin:0;font-weight:700}
.more{color:var(--primary);text-decoration:none;font-size:13px;font-weight:600}
.more:hover{opacity:0.7}
.cats{display:flex;gap:10px;flex-wrap:wrap}
.cat{padding:11px 24px;background:#fff;border-radius:24px;cursor:pointer;font-size:14px;color:var(--text);border:1px solid #e8ddd0;transition:all 0.25s;font-weight:500;box-shadow:0 1px 4px rgba(0,0,0,0.03)}
.cat:hover{background:var(--primary);color:#fff;border-color:var(--primary);transform:translateY(-3px);box-shadow:0 8px 20px rgba(139,69,19,0.25)}
.sec{padding:28px 20px}
.sec-head{margin-bottom:18px}
.sec-head h2{font-size:21px}
.ft{background:#3a2518;text-align:center;padding:24px;margin-top:0}
.ft p{color:rgba(255,255,255,0.3);font-size:12px;margin:3px 0}
.fp{font-family:KaiTi,serif;font-style:italic;color:rgba(255,255,255,0.15)}
</style>
