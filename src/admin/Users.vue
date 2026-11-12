<template>
  <div>
    <div class="ph"><h2>用户管理</h2></div>
    <el-card shadow="never">
      <div style="margin-bottom:12px">
        <el-input v-model="search" placeholder="搜索用户名/邮箱" size="small" clearable style="width:240px" :prefix-icon="Search"/>
      </div>
      <el-table :data="filtered" border stripe v-if="!load">
        <el-table-column prop="id" label="ID" width="60"/><el-table-column prop="username" label="用户名" width="110"/>
        <el-table-column prop="email" label="邮箱" min-width="150"/><el-table-column prop="phone" label="手机号" width="120"/>
        <el-table-column prop="created_at" label="注册时间" width="160"/>
        <el-table-column label="状态" width="70"><template #default="{ row: r }"><el-tag size="small" :type="r.disabled?'danger':'success'">{{r.disabled?'禁用':'正常'}}</el-tag></template></el-table-column>
        <el-table-column label="操作" width="140" fixed="right"><template #default="{ row: r }"><el-button text size="small" :type="r.disabled?'success':'warning'" @click="toggle(r.id)">{{r.disabled?'启用':'禁用'}}</el-button><el-button text size="small" type="danger" @click="del(r.id)">删除</el-button></template></el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
const auth = useAuthStore(); const users = ref([]); const load = ref(false); const search = ref('')
onMounted(async ()=>{ load.value=true; users.value = (await auth.getAllUsers()).sort((a,b)=>b.id-a.id); load.value=false })
const filtered = computed(() => {
  if (!search.value) return users.value
  const kw = search.value.toLowerCase()
  return users.value.filter(u => (u.username||'').toLowerCase().includes(kw) || (u.email||'').toLowerCase().includes(kw))
})
async function toggle(id) { const res = await auth.toggleUserStatus(id); if (res && !res.ok) { ElMessage.error(res.msg || '操作失败'); return }; users.value = (await auth.getAllUsers()).sort((a,b)=>b.id-a.id); ElMessage.success('状态已更新') }
function del(id) { ElMessageBox.confirm('确定删除该用户？其所有在售书籍将同时下架。','提示',{type:'warning'}).then(async()=>{ const res = await auth.deleteUser(id); if (res && !res.ok) { ElMessage.error(res.msg || '删除失败'); return }; users.value=(await auth.getAllUsers()).sort((a,b)=>b.id-a.id); ElMessage.success('已删除') }).catch(()=>{}) }
</script>

<style scoped>
.ph { margin-bottom: 18px; }
.ph h2 { margin: 0; font-size: 22px; color: #1e293b; font-weight: 700; }
:deep(.el-card) { border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 1px 4px rgba(0,0,0,0.03); }
:deep(.el-table th) { background: #f8fafc; color: #64748b; font-weight: 600; font-size: 12px; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; }
:deep(.el-table tr:hover td) { background: #fdf8f2 !important; }
</style>
