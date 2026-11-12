import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import skipFormatting from 'eslint-config-prettier/flat'

export default defineConfig([
  {
    name: 'app/files-to-lint',
    files: ['**/*.{vue,js,mjs,jsx}'],
  },

  globalIgnores(['**/dist/**', '**/dist-ssr/**', '**/coverage/**', '**/node_modules/**']),

  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },

  js.configs.recommended,
  ...pluginVue.configs['flat/essential'],

  {
    name: 'app/rules',
    rules: {
      // 页面组件按路由命名（Home/Login/Orders...），不强制多单词
      'vue/multi-word-component-names': 'off',
      // 允许 catch {} 忽略非关键错误（如统计接口失败不阻塞页面）
      'no-empty': ['error', { allowEmptyCatch: true }],
      // 下划线开头的参数视为有意不使用（如 Express 错误处理中间件的 next）
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },

  skipFormatting,
])
