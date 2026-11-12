<template>
  <div class="page"><NavHeader /><div class="wrap"><div class="hd"><h2>我发布的图书</h2><el-button type="primary" @click="$router.push('/sell')">上架新书</el-button></div><el-card shadow="never" v-if="my.length"><el-table :data="my" border stripe><el-table-column prop="id" label="ID" width="80"/><el-table-column prop="name" label="书名" min-width="140"/><el-table-column prop="author" label="作者" width="110"/><el-table-column prop="price" label="售价" width="80"><template #default="{ row: r }">¥{{r.price}}</template></el-table-column><el-table-column prop="stock" label="库存" width="60"/><el-table-column label="状态" width="80"><template #default="{ row: r }"><el-tag size="small" :type="statusType(r.status)">{{r.status}}</el-tag></template></el-table-column><el-table-column label="操作" width="210" fixed="right"><template #default="{ row: r }"><el-button text size="small" type="primary" @click="openEdit(r)">编辑</el-button><el-button v-if="r.status==='在售'||r.status==='已下架'" text size="small" @click="toggle(r)">{{r.status==='在售'?'下架':'上架'}}</el-button><el-button text size="small" type="danger" @click="del(r.id)">删除</el-button></template></el-table-column></el-table></el-card><el-empty v-else description="还没有发布图书"><el-button type="primary" @click="$router.push('/sell')">去上架</el-button></el-empty>

    <el-dialog v-model="editDlg.vis" title="编辑图书" width="500px" destroy-on-close>
      <el-form :model="editDlg.f" label-width="70px">
        <el-form-item label="书名"><el-input v-model="editDlg.f.name"/></el-form-item>
        <el-form-item label="作者"><el-input v-model="editDlg.f.author"/></el-form-item>
        <el-row :gutter="12">
          <el-col :span="8"><el-form-item label="售价"><el-input-number v-model="editDlg.f.price" :min="0" :precision="2" :controls-position="'right'" style="width:100%"/></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="原价"><el-input-number v-model="editDlg.f.original_price" :min="0" :precision="2" :controls-position="'right'" style="width:100%"/></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="库存"><el-input-number v-model="editDlg.f.stock" :min="0" :controls-position="'right'" style="width:100%"/></el-form-item></el-col>
        </el-row>
        <el-form-item label="成色"><el-select v-model="editDlg.f.condition_grade" style="width:100%"><el-option v-for="c in bookStore.conditions" :key="c" :label="c" :value="c"/></el-select></el-form-item>
        <el-form-item label="描述"><el-input v-model="editDlg.f.description" type="textarea" :rows="3"/></el-form-item>
        <el-form-item label="封面图">
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <el-button size="small" @click="cropVisible=true">上传图片</el-button>
            <el-input v-model="editDlg.f.cover_url" placeholder="或输入URL" style="flex:1;min-width:140px"/>
          </div>
          <ImageCropper v-model="cropVisible" @crop="onCrop" />
        </el-form-item>
      </el-form>
      <template #footer><el-button @click="editDlg.vis=false">取消</el-button><el-button type="primary" @click="doEdit">保存</el-button></template>
    </el-dialog></div></div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useBookStore } from '@/stores/book'
import { useAuthStore } from '@/stores/auth'
import NavHeader from '@/components/NavHeader.vue'
import ImageCropper from '@/components/ImageCropper.vue'
const bookStore = useBookStore(); const auth = useAuthStore(); const cropVisible = ref(false)
const my = computed(()=> [...bookStore.getUserBooks(auth.userName)].sort((a,b)=>b.id-a.id))
onMounted(async ()=>{ await bookStore.fetchBooks({ seller_name: auth.userName }) })
async function toggle(r){
  try {
    await bookStore.updateBook(r.id,{status:r.status==='在售'?'已下架':'在售'})
    ElMessage.success(r.status==='在售'?'已下架':'已上架')
  } catch { ElMessage.error('操作失败') }
}
function statusType(s){const m={'在售':'success','已下架':'info','已交换':'warning','已售罄':'danger','待审核':'warning','已驳回':'danger'};return m[s]||'info'}
function del(id){ElMessageBox.confirm('确定删除？','提示',{type:'warning'}).then(async()=>{await bookStore.deleteBook(id);ElMessage.success('已删除')}).catch(()=>{})}

const editDlg = reactive({vis:false,f:{name:'',author:'',price:0,original_price:0,stock:0,condition_grade:'轻微使用',description:'',cover_url:''},eid:null})
function openEdit(r){
  editDlg.eid = r.id
  editDlg.f = {name:r.name||'',author:r.author||'',price:Number(r.price)||0,original_price:Number(r.original_price||0)||0,stock:Number(r.stock)||0,condition_grade:r.condition_grade||'轻微使用',description:r.description||'',cover_url:r.cover_url||''}
  editDlg.vis = true
}
async function doEdit(){
  if(!editDlg.f.name){ElMessage.warning('请输入书名');return}
  try {
    await bookStore.updateBook(editDlg.eid, editDlg.f)
    ElMessage.success('更新成功')
    editDlg.vis = false
  } catch { ElMessage.error('更新失败') }
}
async function onCrop(file) {
  const formData = new FormData(); formData.append('file', file, file.name || 'cropped.jpg')
  try {
    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    const data = await res.json()
    if (data.ok) { editDlg.f.cover_url = data.url; ElMessage.success('上传成功') } else ElMessage.error(data.msg || '上传失败')
  } catch { ElMessage.error('上传失败') }
}
</script>

<style scoped>
.page { min-height: 100vh; background: var(--bg); }
.wrap { max-width: 1100px; margin: 0 auto; padding: 20px; }
.hd { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.hd h2 { margin: 0; font-size: 20px; color: var(--text); }
:deep(.el-table th) { background: #f8fafc; }
</style>
