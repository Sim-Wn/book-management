<template>
  <div class="cover" :class="variant" :style="gradient">
    <img v-if="book.cover_url && !failed" :src="book.cover_url" class="img" alt="" @error="failed = true" />
    <template v-else>
      <span class="cat">{{ book.category || '图书' }}</span>
      <span class="title">{{ book.name }}</span>
      <span class="author">{{ book.author }}</span>
      <span class="glyph">{{ book.cover || '📗' }}</span>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  book: { type: Object, required: true },
  variant: { type: String, default: 'card' },
})

const failed = ref(false)
watch(() => props.book?.cover_url, () => { failed.value = false })

// 每个分类固定一种书脊配色，同一类书的封面风格保持一致
const PALETTES = [
  ['#74492b', '#c08a58'],
  ['#2e4857', '#4f7a8c'],
  ['#5a3a4d', '#94607d'],
  ['#3f5233', '#7f9a5f'],
  ['#6a3f30', '#b1764f'],
  ['#2c3e50', '#5d7b93'],
  ['#5d4037', '#a1887f'],
  ['#7b202b', '#b5545f'],
]

const gradient = computed(() => {
  // 同一分类的封面固定色系，再按书 id 做轻微变化，避免同类书整页同色
  const key = String(props.book?.category || props.book?.name || '')
  let hash = 0
  for (const ch of key) hash = (hash * 31 + ch.codePointAt(0)) % 9973
  const index = (hash + Number(props.book?.id || 0)) % PALETTES.length
  const [from, to] = PALETTES[index]
  return { background: `linear-gradient(145deg, ${from}, ${to})` }
})
</script>

<style scoped>
.cover {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 18px 16px;
  color: #fff;
  user-select: none;
}
/* 左侧书脊阴影，让封面有厚度感 */
.cover::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 10px;
  background: linear-gradient(90deg, rgba(0, 0, 0, 0.28), rgba(0, 0, 0, 0.02));
}
.cover::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 78% 18%, rgba(255, 255, 255, 0.14), transparent 55%);
  pointer-events: none;
}
.img { width: 100%; height: 100%; object-fit: cover; }
.cat {
  position: absolute;
  bottom: 10px;
  left: 18px;
  font-size: 11px;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.72);
  z-index: 1;
}
.glyph {
  position: absolute;
  top: 10px;
  right: 12px;
  font-size: 20px;
  opacity: 0.85;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
  z-index: 1;
}
.title {
  position: relative;
  z-index: 1;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
}
.author {
  position: relative;
  z-index: 1;
  margin-top: 8px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.75);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.large { padding: 34px 30px 46px; }
.large .cat { bottom: 18px; left: 34px; font-size: 13px; }
.large .glyph { top: 16px; right: 18px; font-size: 28px; }
.large .title { font-size: 28px; -webkit-line-clamp: 3; line-height: 1.35; }
.large .author { font-size: 14px; margin-top: 14px; }
.thumb { padding: 0; }
.thumb .cat,
.thumb .glyph,
.thumb .author { display: none; }
.thumb .title { font-size: 9px; -webkit-line-clamp: 3; line-height: 1.25; text-align: center; padding: 0 2px; }
</style>
