import { createApp } from 'vue'
import App from './App.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './assets/global.css'
import router from './router'
import { createPinia } from 'pinia'
import * as Icons from '@element-plus/icons-vue'

const app = createApp(App)
for (const [key, comp] of Object.entries(Icons)) app.component(key, comp)
app.use(createPinia())
app.use(router)
app.use(ElementPlus)
app.mount('#app')
