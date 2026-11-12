<template>
  <div class="login-page">
    <div class="bg-orbs"><div class="ob o1"></div><div class="ob o2"></div><div class="ob o3"></div></div>
    <div class="login-card">
      <div class="ct"><img src="/logo.svg" class="login-logo" alt="书易" /><h1>书 易</h1><p>校园二手图书交易平台</p></div>
      <h2>欢迎回来</h2>
      <p class="sub">登录您的书易账号</p>
      <el-form @submit.prevent="doLogin">
        <el-form-item><el-input v-model="f.username" placeholder="用户名" size="large" clearable class="gi"><template #prefix><el-icon><User /></el-icon></template></el-input></el-form-item>
        <el-form-item><el-input v-model="f.password" type="password" placeholder="密码" size="large" show-password class="gi"><template #prefix><el-icon><Lock /></el-icon></template></el-input></el-form-item>
        <el-form-item><el-button type="primary" size="large" @click="doLogin" :loading="submitting" block round class="btn">登 录</el-button></el-form-item>
      </el-form>
      <div class="lk"><router-link to="/register">还没有账号？立即注册</router-link><span class="fpw" @click="forgotPwd">忘记密码？</span><router-link to="/admin/login" class="ad">管理员入口</router-link></div>
      <router-link to="/" class="bh">← 返回首页</router-link>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'; import { useRouter } from 'vue-router'; import { ElMessage, ElMessageBox } from 'element-plus'; import { useAuthStore } from '@/stores/auth'
const auth = useAuthStore(); const router = useRouter()
const f = ref({ username: '', password: '' }); const submitting = ref(false)
onMounted(() => { if (auth.isLoggedIn) router.push('/home') })
async function doLogin() {
  if (!f.value.username || !f.value.password) { ElMessage.warning('请输入用户名和密码'); return }
  submitting.value = true
  const r = await auth.login(f.value.username, f.value.password)
  submitting.value = false
  if (r.success) { ElMessage.success('登录成功'); await auth.loadFavorites(); router.push('/home') }
  else ElMessage.error(r.msg || '账号或密码错误')
}
function forgotPwd() { ElMessageBox.alert('请联系管理员重置密码', '忘记密码', { confirmButtonText: '知道了', type: 'info' }) }
</script>
<style scoped>
.login-page{min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(-30deg,#d4b898,#c09870,#d4b898,#b08058,#d4b898);background-size:300% 300%;animation:bgf 20s ease infinite;position:relative;overflow:hidden}
@keyframes bgf{0%{background-position:0% 50%}50%{background-position:100% 100%}100%{background-position:0% 50%}}
.bg-orbs{position:absolute;inset:0;pointer-events:none}
.ob{position:absolute;border-radius:50%;filter:blur(80px);opacity:0.18}
.o1{width:420px;height:420px;background:#c08848;top:-140px;right:-70px;animation:drift 12s infinite}
.o2{width:360px;height:360px;background:#8b6040;bottom:-120px;left:-60px;animation:drift 10s infinite reverse}
.o3{width:280px;height:280px;background:#d4a060;top:50%;left:55%;animation:drift 14s infinite 3s}
@keyframes drift{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(25px,-20px) scale(1.08)}}
.login-card{position:relative;z-index:1;width:400px;padding:42px 38px;background:rgba(255,255,255,0.75);backdrop-filter:blur(16px);border-radius:18px;border:1px solid rgba(255,255,255,0.5);box-shadow:0 8px 32px rgba(80,50,30,0.1)}
.ct{text-align:center;margin-bottom:26px}
.login-logo{width:56px;height:56px;display:block;margin:0 auto 6px}
.ct h1{font-size:34px;color:#4a3020;margin:0 0 4px;font-weight:800;letter-spacing:6px}
.ct p{color:#a08870;font-size:13px;margin:0}
.login-card h2{font-size:20px;color:#4a3020;margin:0 0 2px;font-weight:700}
.sub{color:#a09080;font-size:13px;margin:0 0 22px}
.gi :deep(.el-input__wrapper){background:rgba(255,255,255,0.6);border:1px solid #d8ccbe;box-shadow:none!important;border-radius:10px;transition:all 0.3s}
.gi :deep(.el-input__wrapper:hover){border-color:#b09070}
.gi :deep(.el-input__wrapper.is-focus){border-color:#8b6040;box-shadow:0 0 0 2px rgba(139,96,64,0.1)!important}
.gi :deep(.el-input__inner){color:#4a3020}.gi :deep(.el-input__inner::placeholder){color:#c0a890}.gi :deep(.el-input__prefix){color:#b09880}
.btn{height:46px;font-size:15px;letter-spacing:8px;font-weight:700;border-radius:14px}
.lk{display:flex;justify-content:space-between;margin-top:18px;font-size:13px}
.lk a{color:var(--primary);text-decoration:none;font-weight:500}.lk .ad{color:var(--text-muted);font-size:12px}.lk .fpw{color:var(--text-muted);font-size:12px;cursor:pointer}.lk .fpw:hover{color:var(--primary)}
.bh{display:block;text-align:center;margin-top:18px;color:var(--text-muted);text-decoration:none;font-size:12px}
</style>
