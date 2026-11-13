<template>
  <div class="page">
    <NavHeader />
    <div class="wrap">
      <el-result icon="warning" title="404" sub-title="页面不存在，或者这本书已经被移走了">
        <template #extra>
          <el-button type="primary" @click="$router.push('/home')">回到首页</el-button>
          <el-button @click="$router.push('/books')">去逛逛图书</el-button>
        </template>
      </el-result>
    </div>
  </div>
</template>

<script setup>
import NavHeader from '@/components/NavHeader.vue'
</script>

<style scoped>
.page { min-height: 100vh; background: var(--bg); }
.wrap { max-width: 760px; margin: 0 auto; padding: 80px 20px; }
</style>
