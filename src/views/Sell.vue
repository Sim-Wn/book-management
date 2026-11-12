<template>
  <div class="page">
    <NavHeader />
    <div class="wrap">
      <el-card shadow="never" class="card">
        <template #header><h2>上架图书</h2></template>
        <el-form :model="f" label-width="80px" style="max-width:600px">
          <el-form-item label="书名" required><el-input v-model="f.name" placeholder="请输入书名"/></el-form-item>
          <el-form-item label="作者" required><el-input v-model="f.author" placeholder="请输入作者"/></el-form-item>
          <el-form-item label="分类"><el-select v-model="f.category" placeholder="选择或输入分类" allow-create filterable style="width:100%"><el-option v-for="c in bookStore.categories" :key="c" :label="c" :value="c"/></el-select></el-form-item>
          <el-row :gutter="16"><el-col :span="8"><el-form-item label="原价"><el-input-number v-model="f.original_price" :min="0" :precision="2" style="width:100%"/></el-form-item></el-col><el-col :span="8"><el-form-item label="售价"><el-input-number v-model="f.price" :min="0" :precision="2" style="width:100%"/></el-form-item></el-col><el-col :span="8"><el-form-item label="库存"><el-input-number v-model="f.stock" :min="1" style="width:100%"/></el-form-item></el-col></el-row>
          <el-form-item label="成色"><el-select v-model="f.condition_grade" style="width:100%"><el-option v-for="c in bookStore.conditions" :key="c" :label="c" :value="c"/></el-select></el-form-item>
          <el-form-item label="封面"><div class="emoji-pick"><span v-for="e in bookStore.icons" :key="e" :class="['ep',{sel:f.cover===e}]" @click="f.cover=e">{{e}}</span></div></el-form-item>
          <el-form-item label="封面图">
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <el-button type="primary" size="small" @click="cropVisible=true">上传图片</el-button>
              <el-input v-model="f.cover_url" placeholder="或手动输入图片URL" style="flex:1;min-width:200px"/>
            </div>
            <img v-if="f.cover_url" :src="f.cover_url" class="preview-img" @error="e=>e.target.style.display='none'" />
            <ImageCropper v-model="cropVisible" @crop="onCrop" />
          </el-form-item>
          <el-form-item label="描述"><el-input v-model="f.description" type="textarea" :rows="4" placeholder="描述一下这本书的情况..."/></el-form-item>
          <el-form-item><el-button type="primary" size="large" @click="doSell" :loading="submitting" :disabled="!ok">发布上架</el-button></el-form-item>
        </el-form>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useBookStore } from '@/stores/book'
import { useAuthStore } from '@/stores/auth'
import NavHeader from '@/components/NavHeader.vue'
import ImageCropper from '@/components/ImageCropper.vue'
const bookStore = useBookStore(); const auth = useAuthStore(); const router = useRouter()
const f = reactive({ name:'', author:'', category:'', price:0, original_price:0, stock:1, condition_grade:'轻微使用', cover:'📗', cover_url:'', description:'' })
const ok = computed(() => f.name && f.author && f.price > 0); const submitting = ref(false); const cropVisible = ref(false)
onMounted(async () => { await bookStore.fetchCategories() })
async function doSell() {
  if(!auth.isLoggedIn){ElMessage.warning('请先登录');router.push('/login');return}
  if(!ok.value){ElMessage.warning('请填写完整信息');return}
  submitting.value = true
  const res = await bookStore.addBook({...f, seller_name:auth.userName, seller_id:auth.user?.id})
  submitting.value = false
  if (res && res.ok) { ElMessage.success(res.status === '待审核' ? '已提交，等待管理员审核' : '上架成功！'); router.push('/my-books') }
  else ElMessage.error(res?.msg || '上架失败')
}
async function onCrop(file) {
  const formData = new FormData(); formData.append('file', file, file.name || 'cropped.jpg')
  try {
    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    const data = await res.json()
    if (data.ok) { f.cover_url = data.url; ElMessage.success('上传成功') } else ElMessage.error(data.msg || '上传失败')
  } catch { ElMessage.error('上传失败') }
}
</script>

<style scoped>
.page { min-height: 100vh; background: var(--bg); }
.wrap { max-width: 900px; margin: 0 auto; padding: 20px; }
.card { border-radius: var(--radius); }
.card h2 { margin: 0; }
.emoji-pick { display: flex; flex-wrap: wrap; gap: 6px; }
.ep { font-size: 24px; cursor: pointer; padding: 4px 8px; border-radius: 6px; border: 2px solid transparent; transition: all 0.15s; }
.ep:hover { background: var(--primary-light); border-color: var(--primary-light); }
.ep.sel { border-color: var(--primary); background: var(--primary-light); }
.preview-img { max-width: 200px; max-height: 150px; margin-top: 8px; border-radius: 8px; border: 1px solid var(--border); object-fit: cover; }
</style>
