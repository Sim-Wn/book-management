<template>
  <div>
    <div class="ph"><h2>图书管理</h2><el-button type="primary" @click="openAdd"><el-icon><Plus /></el-icon>新增</el-button></div>
    <el-card shadow="never">
      <div style="margin-bottom:12px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <el-radio-group v-model="tab" size="small">
          <el-radio-button value="all">全部</el-radio-button>
          <el-radio-button value="pending">待审核<template v-if="pendingCount"> ({{pendingCount}})</template></el-radio-button>
        </el-radio-group>
        <el-select v-model="catFilter" placeholder="全部分类" size="small" clearable style="width:130px">
          <el-option label="全部分类" value=""/>
          <el-option v-for="c in bookStore.categories" :key="c" :label="c" :value="c"/>
        </el-select>
        <el-input v-model="search" placeholder="搜索书名/作者" size="small" clearable style="width:200px" :prefix-icon="Search"/>
      </div>
      <el-table :data="filtered" border stripe v-if="!loading">
        <el-table-column prop="id" label="ID" width="75"/><el-table-column prop="name" label="书名" min-width="150"/><el-table-column prop="seller_name" label="卖家" width="100"/><el-table-column prop="category" label="分类" width="100"/><el-table-column prop="price" label="售价" width="75"><template #default="{ row: r }">¥{{r.price}}</template></el-table-column><el-table-column prop="stock" label="库存" width="55"/><el-table-column prop="sales" label="销量" width="55"/>
        <el-table-column label="状态" width="90"><template #default="{ row: r }"><el-tag size="small" :type="statusTagType(r.status)">{{r.status}}</el-tag></template></el-table-column>
        <el-table-column label="操作" width="210" fixed="right"><template #default="{ row: r }"><el-button text size="small" v-if="r.status==='待审核'" type="success" @click="audit(r.id)">通过</el-button><el-button text size="small" v-if="r.status==='待审核'" type="warning" @click="reject(r.id)">驳回</el-button><el-button text size="small" @click="openEdit(r)">编辑</el-button><el-button text size="small" type="danger" @click="doDelete(r.id)">删除</el-button></template></el-table-column>
      </el-table>
    </el-card>
    <el-dialog v-model="dlg.vis" :title="dlg.edit?'编辑图书':'新增图书'" width="520px" destroy-on-close>
      <el-form :model="dlg.f" label-width="70px"><el-form-item label="书名"><el-input v-model="dlg.f.name"/></el-form-item><el-form-item label="作者"><el-input v-model="dlg.f.author"/></el-form-item><el-form-item label="分类"><el-select v-model="dlg.f.category" placeholder="选择分类" allow-create filterable style="width:100%"><el-option v-for="c in bookStore.categories" :key="c" :label="c" :value="c"/></el-select></el-form-item><el-row :gutter="12"><el-col :span="8"><el-form-item label="原价"><el-input-number v-model="dlg.f.original_price" :min="0" :precision="2" :controls-position="'right'" style="width:100%"/></el-form-item></el-col><el-col :span="8"><el-form-item label="售价"><el-input-number v-model="dlg.f.price" :min="0" :precision="2" :controls-position="'right'" style="width:100%"/></el-form-item></el-col><el-col :span="8"><el-form-item label="库存"><el-input-number v-model="dlg.f.stock" :min="0" :controls-position="'right'" style="width:100%"/></el-form-item></el-col></el-row><el-form-item label="成色"><el-input v-model="dlg.f.condition_grade"/></el-form-item><el-form-item label="描述"><el-input v-model="dlg.f.description" type="textarea" :rows="3"/></el-form-item><el-form-item label="图标"><div class="emoji-pick"><span v-for="e in bookStore.icons" :key="e" :class="['ep',{sel:dlg.f.cover===e}]" @click="dlg.f.cover=e">{{e}}</span></div></el-form-item><el-form-item label="封面图">
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <el-button type="primary" size="small" @click="cropVisible=true">上传图片</el-button>
              <el-input v-model="dlg.f.cover_url" placeholder="或输入图片URL" style="flex:1;min-width:160px"/>
            </div>
            <img v-if="dlg.f.cover_url" :src="dlg.f.cover_url" class="preview-img" @error="e=>e.target.style.display='none'" />
            <ImageCropper v-model="cropVisible" @crop="onCrop" />
          </el-form-item></el-form>
      <template #footer><el-button @click="dlg.vis=false">取消</el-button><el-button type="primary" @click="doSave">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { useBookStore } from '@/stores/book'
import ImageCropper from '@/components/ImageCropper.vue'
const bookStore = useBookStore(); const cropVisible = ref(false)
const tab = ref('all'); const loading = ref(false); const catFilter = ref(''); const search = ref('')
onMounted(async ()=>{ loading.value=true; await bookStore.fetchBooks(); await bookStore.fetchCategories(); loading.value=false })
const pendingCount = computed(()=> bookStore.books.filter(b=>b.status==='待审核').length)
const filtered = computed(()=> {
  let list = tab.value==='pending' ? bookStore.books.filter(b=>b.status==='待审核') : [...bookStore.books]
  if (catFilter.value) list = list.filter(b => b.category === catFilter.value)
  if (search.value) {
    const kw = search.value.toLowerCase()
    list = list.filter(b => (b.name||'').toLowerCase().includes(kw) || (b.author||'').toLowerCase().includes(kw))
  }
  return list.sort((a, b) => b.id - a.id)
})
const dlg = reactive({vis:false,edit:false,f:{name:'',author:'',category:'',price:0,original_price:0,stock:0,condition_grade:'轻微使用',description:'',cover:'📗',cover_url:''},eid:null})
function openAdd(){dlg.edit=false;dlg.eid=null;dlg.f={name:'',author:'',category:'',price:0,original_price:0,stock:0,condition_grade:'轻微使用',description:'',cover:'📗',cover_url:''};dlg.vis=true}
function openEdit(r){dlg.edit=true;dlg.eid=r.id;dlg.f={name:r.name||'',author:r.author||'',category:r.category||'',price:Number(r.price)||0,original_price:Number(r.original_price||r.originalPrice)||0,stock:Number(r.stock)||0,condition_grade:r.condition_grade||'',description:r.description||'',cover:r.cover||'📗',cover_url:r.cover_url||''};dlg.vis=true}
async function doSave(){if(!dlg.f.name){ElMessage.warning('请输入书名');return};if(dlg.edit){await bookStore.updateBook(dlg.eid,dlg.f);ElMessage.success('更新成功')}else{await bookStore.addBook({...dlg.f,seller_name:'平台官方'});ElMessage.success('添加成功')};dlg.vis=false}
async function doDelete(id){ElMessageBox.confirm('确定删除？','提示',{type:'warning'}).then(async()=>{await bookStore.deleteBook(id);ElMessage.success('已删除')}).catch(()=>{})}
async function audit(id){ ElMessageBox.confirm('确定审核通过该书？','审核确认',{type:'success'}).then(async()=>{await bookStore.updateBook(id,{status:'在售'});ElMessage.success('审核通过')}).catch(()=>{}) }
function statusTagType(s){const m={'在售':'success','待审核':'warning','已驳回':'danger','已下架':'info','已交换':'warning','已售罄':'danger'};return m[s]||'info'}
async function reject(id){ ElMessageBox.confirm('确定驳回该书？驳回后将下架。','驳回确认',{type:'warning'}).then(async()=>{await bookStore.updateBook(id,{status:'已驳回'});ElMessage.success('已驳回')}).catch(()=>{}) }
async function onCrop(file) {
  const formData = new FormData(); formData.append('file', file, file.name || 'cropped.jpg')
  try {
    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    const data = await res.json()
    if (data.ok) { dlg.f.cover_url = data.url; ElMessage.success('上传成功') } else ElMessage.error(data.msg || '上传失败')
  } catch { ElMessage.error('上传失败') }
}
</script>

<style scoped>
.ph { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
.ph h2 { margin: 0; font-size: 22px; color: #1e293b; font-weight: 700; }
:deep(.el-card) { border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 1px 4px rgba(0,0,0,0.03); }
:deep(.el-table) { --el-table-border-color: #f1f5f9; }
:deep(.el-table th) { background: #f8fafc; color: #64748b; font-weight: 600; font-size: 12px; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; }
:deep(.el-table tr:hover td) { background: #fdf8f2 !important; }
.emoji-pick { display: flex; flex-wrap: wrap; gap: 6px; }
.ep { font-size: 24px; cursor: pointer; padding: 4px 8px; border-radius: 6px; border: 2px solid transparent; transition: all 0.15s; }
.ep:hover { background: var(--primary-light); border-color: var(--primary-light); }
.ep.sel { border-color: var(--primary); background: var(--primary-light); }
.preview-img { max-width: 200px; max-height: 150px; margin-top: 8px; border-radius: 8px; border: 1px solid var(--border); object-fit: cover; }
</style>
