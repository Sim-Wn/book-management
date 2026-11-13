<template>
  <div class="page"><NavHeader /><div class="wrap"><el-card shadow="never" class="card" v-if="auth.isLoggedIn"><template #header><h2>个人中心</h2></template><div class="av"><div class="avatar-wrap"><img v-if="f.avatar && !imgErr" :src="f.avatar" class="avatar-img" @error="imgErr=true" /><el-icon v-if="!f.avatar || imgErr" size="48"><UserFilled /></el-icon><el-button size="small" text type="primary" @click="cropVisible=true">更换头像</el-button></div><span>{{ auth.userName }}</span></div><el-form :model="f" label-width="80px" style="max-width:500px;margin:20px auto 0"><el-form-item label="用户名"><el-input v-model="f.username"/></el-form-item><el-form-item label="手机号"><el-input v-model="f.phone"/></el-form-item><el-form-item label="邮箱"><el-input v-model="f.email"/></el-form-item><el-form-item label="地址"><el-input v-model="f.address"/></el-form-item><el-form-item label="简介"><el-input v-model="f.bio" type="textarea" :rows="2"/></el-form-item><el-form-item><el-button type="primary" @click="save">保存修改</el-button></el-form-item></el-form></el-card><el-empty v-else description="请先登录"><el-button type="primary" @click="$router.push('/login')">去登录</el-button></el-empty></div></div>
    <ImageCropper v-model="cropVisible" :aspect-ratio="1" @crop="onAvatarCrop" />
    <el-card shadow="never" class="card pwd-card" v-if="auth.isLoggedIn">
      <template #header><h2>修改密码</h2></template>
      <el-form label-width="90px" style="max-width:500px;margin:0 auto">
        <el-form-item label="原密码"><el-input v-model="pwd.old" type="password" show-password /></el-form-item>
        <el-form-item label="新密码"><el-input v-model="pwd.new" type="password" show-password placeholder="至少 6 位" /></el-form-item>
        <el-form-item label="确认新密码"><el-input v-model="pwd.confirm" type="password" show-password /></el-form-item>
        <el-form-item><el-button type="primary" :loading="savingPwd" @click="changePwd">修改密码</el-button></el-form-item>
      </el-form>
    </el-card>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import NavHeader from '@/components/NavHeader.vue'
import ImageCropper from '@/components/ImageCropper.vue'
import { api } from '@/api'
const auth = useAuthStore()
const f = reactive({ username:'', phone:'', email:'', address:'', bio:'', avatar:'' })
onMounted(()=>{ if(auth.user) Object.assign(f, auth.user) })
async function save(){await auth.updateProfile({...f});ElMessage.success('保存成功')}

const pwd = reactive({ old: '', new: '', confirm: '' })
const savingPwd = ref(false)
async function changePwd() {
  if (!pwd.old || !pwd.new) return ElMessage.warning('请填写原密码和新密码')
  if (pwd.new.length < 6) return ElMessage.warning('新密码至少 6 位')
  if (pwd.new !== pwd.confirm) return ElMessage.warning('两次输入的新密码不一致')
  savingPwd.value = true
  try {
    const r = await api.updatePassword({ oldPassword: pwd.old, newPassword: pwd.new })
    if (r && r.ok === false) return ElMessage.error(r.msg || '修改失败')
    ElMessage.success('密码已修改，下次请用新密码登录')
    pwd.old = ''; pwd.new = ''; pwd.confirm = ''
  } catch (e) {
    ElMessage.error(e.message || '修改失败')
  } finally {
    savingPwd.value = false
  }
}
const imgErr = ref(false); const cropVisible = ref(false)
async function onAvatarCrop(file) {
  const formData = new FormData(); formData.append('file', file, file.name || 'avatar.jpg')
  try {
    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    const data = await res.json()
    if (data.ok) { f.avatar = data.url; imgErr.value = false; ElMessage.success('头像上传成功') } else ElMessage.error(data.msg || '上传失败')
  } catch { ElMessage.error('上传失败') }
}
</script>

<style scoped>
.page { min-height: 100vh; background: var(--bg); }
.wrap { max-width: 700px; margin: 0 auto; padding: 20px; }
.card { border-radius: var(--radius); }
.card h2 { margin: 0; }
.av { text-align: center; padding: 20px 0; display: flex; flex-direction: column; align-items: center; gap: 8px; color: var(--text); font-weight: 600; }
.avatar-wrap { position: relative; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.avatar-img { width: 72px; height: 72px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border); }
.avatar-upload { display: inline-block; }
.pwd-card { margin-top: 18px; }
</style>
