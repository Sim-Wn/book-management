<template>
  <div class="card" @click="$router.push('/books/' + book.id)">
    <div class="card-cover">
      <img v-if="book.cover_url" :src="book.cover_url" class="cover-img" @error="e=>{e.target.style.display='none';imgErr=true}" />
      <span v-show="!book.cover_url || imgErr" class="emoji">{{ book.cover }}</span>
      <el-tag v-if="book.condition_grade" size="small" class="cond" type="warning" effect="dark">{{ book.condition_grade }}</el-tag>
      <el-button class="fav" :class="{ on: auth.isFavorite(book.id) }" size="small" circle @click.stop="toggle(book.id)">
        <el-icon size="14"><Star /></el-icon>
      </el-button>
    </div>
    <div class="card-body">
      <h4 class="name">{{ book.name }}</h4>
      <p class="author">{{ book.author }}</p>
      <div class="meta">
        <span class="price">¥{{ book.price }}</span>
        <span class="orig">¥{{ book.original_price || book.originalPrice }}</span>
      </div>
      <div class="foot">
        <span class="seller">{{ book.seller_name }}</span>
        <span class="rating" v-if="book.rating">★ {{ book.rating }}</span>
        <span class="sales">已售{{ book.sales }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
defineProps({ book: Object })
const auth = useAuthStore()
const imgErr = ref(false)
async function toggle(id) {
  const added = await auth.toggleFavorite(id)
  ElMessage({ message: added ? '已收藏' : '取消收藏', type: 'success', duration: 1000, showClose: false })
}
</script>

<style scoped>
.card {
  background: #fff; border-radius: 12px; overflow: hidden;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06); cursor: pointer; transition: all 0.3s cubic-bezier(.4,0,.2,1);
  border: 1px solid #f0ebe0;
}
.card:hover { transform: translateY(-5px); box-shadow: 0 12px 28px rgba(80,50,30,0.12); border-color: #d4c0a0; }
.card-cover {
  height: 180px; background: linear-gradient(160deg, #faf6ef, #f0e8d8);
  display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden;
}
.card-cover::after { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(0deg, rgba(0,0,0,0.02) 0%, transparent 40%); pointer-events: none; }
.cover-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s; }
.card:hover .cover-img { transform: scale(1.05); }
.emoji { font-size: 58px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1)); }
.cond { position: absolute; top: 10px; left: 10px; font-size: 11px; backdrop-filter: blur(4px); }
.fav { position: absolute; top: 10px; right: 10px; background: rgba(255,255,255,0.92); border-color: #e5e0f0; backdrop-filter: blur(4px); transition: all 0.2s; }
.fav:hover { transform: scale(1.1); }
.fav.on { background: var(--primary-light); border-color: var(--primary); color: var(--primary); }
.card-body { padding: 14px 16px; }
.name { margin: 0 0 5px; font-size: 15px; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
.author { margin: 0 0 10px; font-size: 12px; color: var(--text-muted); }
.meta { display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px; }
.price { font-size: 20px; font-weight: 800; color: var(--danger); }
.orig { font-size: 12px; color: #c0b0a0; text-decoration: line-through; }
.foot { display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--text-muted); padding-top: 8px; border-top: 1px solid #f5f0e8; }
.rating { color: #f59e0b; font-weight: 600; }
.sales { background: #fdf6f0; padding: 2px 8px; border-radius: 10px; color: #b08860; }
</style>
