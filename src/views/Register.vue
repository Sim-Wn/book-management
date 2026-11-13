<template>
  <div class="reg-page">
    <div class="bg-anim">
      <div class="sphere s1"></div><div class="sphere s2"></div><div class="sphere s3"></div>
      <div class="sphere s4"></div><div class="sphere s5"></div>
    </div>
    <div class="reg-card">
      <div class="card-brand">
        <el-icon size="48"><Reading /></el-icon>
        <h1>加入书易</h1>
        <p>注册即享海量二手好书</p>
      </div>
      <h2>创建账号</h2>
      <p class="subtitle">注册您的书易账号</p>
      <el-form :model="form" @submit.prevent="doRegister">
        <el-form-item><el-input v-model="form.username" placeholder="用户名" size="large" clearable class="glass-input"><template #prefix><el-icon><User /></el-icon></template></el-input></el-form-item>
        <el-form-item><el-input v-model="form.password" type="password" placeholder="密码" size="large" show-password class="glass-input"><template #prefix><el-icon><Lock /></el-icon></template></el-input></el-form-item>
        <el-form-item><el-input v-model="form.confirmPassword" type="password" placeholder="确认密码" size="large" show-password class="glass-input"><template #prefix><el-icon><Lock /></el-icon></template></el-input></el-form-item>
        <el-form-item><el-input v-model="form.phone" placeholder="手机号（选填）" size="large" clearable class="glass-input"><template #prefix><el-icon><Phone /></el-icon></template></el-input></el-form-item>
        <el-form-item><el-checkbox v-model="agreeTerms" class="terms-check">我已阅读并同意《服务条款》和《隐私政策》</el-checkbox></el-form-item>
        <el-form-item><el-button type="primary" size="large" @click="doRegister" :loading="submitting" block round class="reg-btn">注 册</el-button></el-form-item>
      </el-form>
      <p class="link"><router-link to="/login">已有账号？立即登录</router-link></p>
      <router-link to="/" class="back-home">← 返回首页</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
const auth = useAuthStore(); const router = useRouter()
const form = ref({ username: '', password: '', confirmPassword: '', phone: '' })
const agreeTerms = ref(false); const submitting = ref(false)
async function doRegister() {
  if (!form.value.username || !form.value.password) { ElMessage.warning('请填写用户名和密码'); return }
  if (form.value.password !== form.value.confirmPassword) { ElMessage.warning('两次输入的密码不一致'); return }
  if (!agreeTerms.value) { ElMessage.warning('请先同意服务条款'); return }
  submitting.value = true
  const r = await auth.register({ username: form.value.username, password: form.value.password, phone: form.value.phone })
  submitting.value = false
  if (r.ok) { ElMessage.success('注册成功，请登录'); router.push('/login') }
  else ElMessage.error(r.msg || '注册失败')
}
</script>

<style scoped>
.reg-page {
  min-height: 100vh; display: flex; align-items: center; justify-content: center;
  background: linear-gradient(-45deg, #2a1c12, #3a2518, #4a3020, #5c3c28, #3a2518);
  background-size: 400% 400%; animation: bgFlow 20s ease infinite;
  position: relative; overflow: hidden;
}
@keyframes bgFlow { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
.bg-anim { position: absolute; inset: 0; pointer-events: none; }
.sphere {
  position: absolute; border-radius: 50%; filter: blur(60px); opacity: 0.15;
}
.s1 { width: 500px; height: 500px; background: #8b6040; top: -150px; right: -100px; animation: float1 12s ease-in-out infinite; }
.s2 { width: 400px; height: 400px; background: #c08848; bottom: -120px; left: -80px; animation: float2 10s ease-in-out infinite; }
.s3 { width: 300px; height: 300px; background: #d4a060; top: 40%; left: 50%; animation: float3 14s ease-in-out infinite; }
.s4 { width: 250px; height: 250px; background: #6b4c38; top: 10%; left: 10%; animation: float1 8s ease-in-out infinite reverse; }
.s5 { width: 200px; height: 200px; background: #a08068; bottom: 20%; right: 20%; animation: float2 11s ease-in-out infinite reverse; }
@keyframes float1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(40px,-30px) scale(1.1)} 66%{transform:translate(-20px,20px) scale(0.9)} }
@keyframes float2 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-30px,-20px) scale(1.05)} 66%{transform:translate(20px,30px) scale(0.95)} }
@keyframes float3 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(30px,40px) scale(1.1)} }
.reg-card {
  position: relative; z-index: 1; width: 420px; padding: 48px 40px;
  background: rgba(255,255,255,0.06); backdrop-filter: blur(24px);
  border-radius: 24px; border: 1px solid rgba(255,255,255,0.1);
  box-shadow: 0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05);
}
.card-brand { text-align: center; margin-bottom: 32px; }
.card-brand h1 { font-size: 32px; color: #fff; margin: 8px 0 4px; font-weight: 800; letter-spacing: 4px; }
.card-brand p { color: rgba(255,255,255,0.4); font-size: 13px; margin: 0; }
.reg-card h2 { font-size: 22px; color: #fff; margin: 0 0 4px; font-weight: 700; }
.subtitle { color: rgba(255,255,255,0.45); font-size: 13px; margin: 0 0 24px; }
.glass-input :deep(.el-input__wrapper) {
  background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12);
  box-shadow: none !important; border-radius: 12px; transition: all 0.3s;
}
.glass-input :deep(.el-input__wrapper:hover) { border-color: rgba(255,255,255,0.25); background: rgba(255,255,255,0.12); }
.glass-input :deep(.el-input__wrapper.is-focus) { border-color: #c08848; background: rgba(255,255,255,0.12); box-shadow: 0 0 0 2px rgba(192,136,72,0.25) !important; }
.glass-input :deep(.el-input__inner) { color: #fff; }
.glass-input :deep(.el-input__inner::placeholder) { color: rgba(255,255,255,0.3); }
.glass-input :deep(.el-input__prefix) { color: rgba(255,255,255,0.4); }
.reg-btn { width: 100%; height: 48px; font-size: 16px; letter-spacing: 8px; font-weight: 700; border-radius: 14px; background: linear-gradient(135deg, #8b6040, #c08848); border: none; }
.reg-btn:hover { background: linear-gradient(135deg, #6b4c38, #8b6040); transform: translateY(-1px); box-shadow: 0 6px 20px rgba(139,96,64,0.4); }
.link { text-align: center; margin-top: 20px; font-size: 13px; }
.link a { color: rgba(255,255,255,0.55); text-decoration: none; font-weight: 500; transition: color 0.2s; }
.link a:hover { color: rgba(255,255,255,0.85); }
.terms-check { --el-checkbox-text-color: rgba(255,255,255,0.6); }
.terms-check :deep(.el-checkbox__label) { font-size: 12px; }
.back-home { display: block; text-align: center; margin-top: 20px; color: rgba(255,255,255,0.25); text-decoration: none; font-size: 12px; transition: color 0.2s; }
.back-home:hover { color: rgba(255,255,255,0.55); }
@media (max-width: 480px) { .reg-card { width: calc(100vw - 32px); padding: 36px 24px; } }
</style>
