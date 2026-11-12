<template>
  <div class="ad-login">
    <div class="bg-orbs"><div class="ob o1"></div><div class="ob o2"></div><div class="ob o3"></div></div>
    <div class="ad-card">
      <div class="ct"><img src="/logo.svg" class="login-logo" alt="书易" /><h1>书易后台</h1><p>管理员控制面板</p></div>
      <h2>管理员登录</h2>
      <el-form @submit.prevent="doLogin">
        <el-form-item><el-input v-model="f.username" placeholder="管理员账号" size="large" clearable class="gi"><template #prefix><el-icon><User /></el-icon></template></el-input></el-form-item>
        <el-form-item><el-input v-model="f.password" type="password" placeholder="管理员密码" size="large" show-password class="gi"><template #prefix><el-icon><Lock /></el-icon></template></el-input></el-form-item>
        <el-form-item><el-button type="primary" size="large" @click="doLogin" block round class="btn">登 录 后 台</el-button></el-form-item>
      </el-form>
      <div class="lk"><router-link to="/login">← 返回用户登录</router-link></div>
      <router-link to="/" class="bh">← 返回首页</router-link>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'; import { useRouter } from 'vue-router'; import { ElMessage } from 'element-plus'; import { useAuthStore } from '@/stores/auth'
const auth = useAuthStore(); const router = useRouter()
const f = ref({ username: '', password: '' })
onMounted(() => { if (auth.isAdmin) router.push('/admin/dashboard') })
async function doLogin() {
  const r = await auth.login(f.value.username, f.value.password)
  if (r.success && r.role === 'admin') { ElMessage.success('管理员登录成功'); router.push('/admin/dashboard') }
  else ElMessage.error(r.msg || '账号或密码错误')
}
</script>
<style scoped>
.ad-login{min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(-30deg,#3a2518,#4a3424,#3a2518,#554030,#3a2518);background-size:300% 300%;animation:bgf 22s ease infinite;position:relative;overflow:hidden}
@keyframes bgf{0%{background-position:0% 50%}50%{background-position:100% 100%}100%{background-position:0% 50%}}
.bg-orbs{position:absolute;inset:0;pointer-events:none}
.ob{position:absolute;border-radius:50%;filter:blur(80px);opacity:0.1}
.o1{width:460px;height:460px;background:#8b6040;top:-150px;right:-80px;animation:drift 14s infinite}
.o2{width:380px;height:380px;background:#5c3424;bottom:-100px;left:-50px;animation:drift 12s infinite reverse}
.o3{width:260px;height:260px;background:#6b4030;top:50%;left:55%;animation:drift 16s infinite 3s}
@keyframes drift{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(20px,-15px) scale(1.06)}}
.ad-card{position:relative;z-index:1;width:400px;padding:40px 36px;background:rgba(30,18,10,0.5);backdrop-filter:blur(20px);border-radius:18px;border:1px solid rgba(255,255,255,0.06);box-shadow:0 8px 40px rgba(0,0,0,0.4)}
.ct{text-align:center;margin-bottom:24px}
.login-logo{width:48px;height:48px;display:block;margin:0 auto 6px}
.ct h1{font-size:28px;color:#c08848;margin:0 0 2px;font-weight:800;letter-spacing:4px}
.ct p{color:rgba(255,255,255,0.25);font-size:13px;margin:0}
.ad-card h2{font-size:20px;color:#d0c0b0;margin:0 0 2px;font-weight:700}
.ad-card h2+*{margin-top:4px}
.gi :deep(.el-input__wrapper){background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);box-shadow:none!important;border-radius:10px}
.gi :deep(.el-input__wrapper:hover){border-color:rgba(255,255,255,0.12);background:rgba(255,255,255,0.06)}
.gi :deep(.el-input__wrapper.is-focus){border-color:#8b6040;box-shadow:0 0 0 2px rgba(139,96,64,0.15)!important}
.gi :deep(.el-input__inner){color:#e0d0c0}.gi :deep(.el-input__inner::placeholder){color:rgba(255,255,255,0.15)}.gi :deep(.el-input__prefix){color:rgba(255,255,255,0.2)}
.btn{height:46px;font-size:15px;letter-spacing:6px;font-weight:700;border-radius:14px}
.lk{display:flex;justify-content:space-between;align-items:center;margin-top:18px;font-size:13px}
.lk a{color:rgba(255,255,255,0.35);text-decoration:none}.lk a:hover{color:rgba(255,255,255,0.55)}
.h{color:rgba(255,255,255,0.15);font-size:12px}
.bh{display:block;text-align:center;margin-top:16px;color:rgba(255,255,255,0.15);text-decoration:none;font-size:12px}.bh:hover{color:rgba(255,255,255,0.35)}
</style>
