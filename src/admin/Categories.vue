<template>
  <div>
    <div class="ph"><h2>分类管理</h2><el-button type="primary" @click="openAdd"><el-icon><Plus /></el-icon>新增分类</el-button></div>
    <el-card shadow="never">
      <el-table :data="bookStore.categoryList" border stripe>
        <el-table-column prop="id" label="ID" width="80"/>
        <el-table-column prop="name" label="分类名称" min-width="160"/>
        <el-table-column prop="icon" label="图标" width="80"/>
        <el-table-column prop="sort_order" label="排序" width="80"/>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row: r }">
            <el-button text size="small" @click="openEdit(r)">编辑</el-button>
            <el-button text size="small" type="danger" @click="doDelete(r.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dlg.vis" :title="dlg.edit?'编辑分类':'新增分类'" width="420px" destroy-on-close>
      <el-form :model="dlg.f" label-width="70px">
        <el-form-item label="名称"><el-input v-model="dlg.f.name" placeholder="分类名称"/></el-form-item>
        <el-form-item label="图标">
          <div class="emoji-pick">
            <span v-for="e in icons" :key="e" :class="['ep',{sel:dlg.f.icon===e}]" @click="dlg.f.icon=e">{{e}}</span>
          </div>
        </el-form-item>
        <el-form-item label="排序"><el-input-number v-model="dlg.f.sort_order" :min="0" style="width:100%"/></el-form-item>
      </el-form>
      <template #footer><el-button @click="dlg.vis=false">取消</el-button><el-button type="primary" @click="doSave">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup>
import { reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useBookStore } from '@/stores/book'
const bookStore = useBookStore()
const icons = ['📚','📗','📘','📙','📕','📓','📔','📒','🐍','🌐','📐','💻','🔧','🎨','📊','🔬','🎭','🏛️','💡','📖','🏷️','🔖','📌','🗂️']
const dlg = reactive({vis:false,edit:false,f:{name:'',icon:'📚',sort_order:0},eid:null})
onMounted(async () => { await bookStore.fetchCategoryList() })
function openAdd(){ dlg.edit=false; dlg.eid=null; dlg.f={name:'',icon:'📚',sort_order:0}; dlg.vis=true }
function openEdit(r){ dlg.edit=true; dlg.eid=r.id; dlg.f={name:r.name||'',icon:r.icon||'📚',sort_order:r.sort_order||0}; dlg.vis=true }
async function doSave(){
  if(!dlg.f.name){ElMessage.warning('请输入分类名称');return}
  let res
  if(dlg.edit){ await bookStore.updateCategory(dlg.eid,dlg.f); ElMessage.success('更新成功') }
  else { res = await bookStore.createCategory(dlg.f); if (res && res.ok) ElMessage.success('添加成功'); else { ElMessage.error(res?.msg||'添加失败'); return } }
  dlg.vis=false
}
async function doDelete(id){ElMessageBox.confirm('确定删除？','提示',{type:'warning'}).then(async()=>{try{await bookStore.deleteCategory(id);ElMessage.success('已删除')}catch{ElMessage.error('删除失败')}}).catch(()=>{})}
</script>

<style scoped>
.ph { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
.ph h2 { margin: 0; font-size: 22px; color: #1e293b; font-weight: 700; }
:deep(.el-card) { border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 1px 4px rgba(0,0,0,0.03); }
:deep(.el-table th) { background: #f8fafc; color: #64748b; font-weight: 600; font-size: 12px; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; }
:deep(.el-table tr:hover td) { background: #fdf8f2 !important; }
.emoji-pick { display: flex; flex-wrap: wrap; gap: 6px; }
.ep { font-size: 24px; cursor: pointer; padding: 4px 8px; border-radius: 6px; border: 2px solid transparent; transition: all 0.15s; }
.ep:hover { background: var(--primary-light); border-color: var(--primary-light); }
.ep.sel { border-color: var(--primary); background: var(--primary-light); }
</style>
