<template>
  <div class="clock-pill">
    <span class="clock-date">{{ dateStr }}</span>
    <span class="clock-divider"></span>
    <span class="clock-time">{{ timeStr }}</span>
    <span class="clock-dot" :class="{ pulse: !paused }"></span>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const now = ref(new Date())
let timer = null
const paused = ref(false)

const weekMap = ['日', '一', '二', '三', '四', '五', '六']

const dateStr = computed(() => {
  const d = now.value
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const w = weekMap[d.getDay()]
  return `${y}-${m}-${day} 周${w}`
})

const timeStr = computed(() => {
  const d = now.value
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
})

function tick() {
  now.value = new Date()
}

onMounted(() => {
  timer = setInterval(tick, 1000)
  document.addEventListener('visibilitychange', () => {
    paused.value = document.hidden
  })
})

onUnmounted(() => {
  clearInterval(timer)
})
</script>

<style scoped>
.clock-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(135deg, rgba(139, 69, 19, 0.04), rgba(212, 148, 58, 0.06));
  border: 1px solid rgba(139, 69, 19, 0.12);
  border-radius: 20px;
  padding: 4px 12px;
  font-family: 'SF Mono', 'Cascadia Code', 'Consolas', 'Microsoft YaHei', monospace;
  user-select: none;
  white-space: nowrap;
  transition: all 0.3s;
}
.clock-pill:hover {
  background: linear-gradient(135deg, rgba(139, 69, 19, 0.08), rgba(212, 148, 58, 0.12));
  border-color: rgba(139, 69, 19, 0.2);
  box-shadow: 0 0 12px rgba(139, 69, 19, 0.06);
}
.clock-date {
  font-size: 11px;
  color: var(--text-muted);
  letter-spacing: 0.3px;
}
.clock-divider {
  width: 1px;
  height: 14px;
  background: rgba(139, 69, 19, 0.15);
  border-radius: 1px;
}
.clock-time {
  font-size: 13px;
  font-weight: 600;
  color: var(--primary);
  letter-spacing: 0.5px;
}
.clock-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  transition: opacity 0.6s;
  opacity: 0.5;
  flex-shrink: 0;
}
.clock-dot.pulse {
  animation: dotPulse 1s ease-in-out infinite;
}
@keyframes dotPulse {
  0%, 100% { opacity: 0.5; box-shadow: 0 0 0 0 rgba(212, 148, 58, 0.4); }
  50% { opacity: 1; box-shadow: 0 0 6px 1px rgba(212, 148, 58, 0.5); }
}
</style>
