# 改造记录

本文档记录为「可对外展示 / 可写进简历」所做的工程化改造，便于回滚和答辩时讲清楚每一处为什么改。

## 一、鉴权与安全

| 改动 | 位置 | 原因 |
|---|---|---|
| 新增 JWT 校验中间件 `authRequired` / `adminOnly` | `server/middleware/auth.js` | 原来只签发 token、全项目没有校验，任何人直接调接口就能删用户、改订单 |
| 管理接口全部加 `adminOnly` | `routes/auth.js`、`categories.js`、`swaps.js` | 用户列表、禁用/删除用户、分类增删改、强制改交换状态原先完全公开 |
| 用户接口校验资源归属 | `routes/books.js`、`orders.js`、`messages.js`、`forum.js` | 任何登录用户都能改别人的书、取消别人的订单、看别人的私信 |
| 身份一律取自 token | `books` / `orders` / `swaps` / `messages` / `forum` | 原来信任请求体里的 `user_id`、`seller_id`、`sender_id`，可以冒名操作 |
| 新增 `/api/stats` 并替换首页的用户列表请求 | `routes/stats.js`、`Home.vue`、`Dashboard.vue` | 首页为了显示「注册用户数」拉取了全部用户的邮箱和手机号 |
| 登录 / 注册加频率限制 | `server/middleware/rateLimit.js` | 防暴力破解与批量注册 |
| 统一 401 / 403 响应，前端自动清理会话并跳登录 | `src/api/index.js` | 原来 token 过期后页面只会静默失败 |
| 路由守卫改为同时校验 token 与管理员身份 | `src/router/index.js` | 原来只看 `localStorage` 里的布尔值，改一下就进后台 |
| 上传接口要求登录并校验真实 MIME | `routes/upload.js` | 原来匿名就能往服务器传文件 |

## 二、交易数据一致性

| 改动 | 位置 | 原因 |
|---|---|---|
| 下单只接收 `book_id + quantity`，价格与总价由服务端计算 | `routes/orders.js` | 原来 `total`、`price` 全部来自前端，改成 0.01 元即可下单 |
| 校验「一次只能买同一卖家的书」 | `routes/orders.js` | 原订单只有一个 `seller_id`，混合下单会串卖家 |
| 库存扣减、状态流转使用事务 + `SELECT ... FOR UPDATE` | `routes/orders.js`、`swaps.js` | 防止并发超卖与重复完成交换 |
| 取消 / 退货完成时回滚库存 | `routes/orders.js` | 原来取消订单库存永久少一本 |
| 销量改为「订单完成」时累加 | `routes/orders.js` | 原来下单就加销量，取消也不减，数据虚高 |
| 新增历史销量重算脚本（默认只预览） | `server/scripts/recalc-sales.mjs` | 用于把老数据的销量对齐到新口径 |
| 修复交换完成时的解构错误 | `routes/swaps.js` | `conn.query` 返回 `[rows, fields]`，原代码少解构一层，导致 `seller_id` 取到 `undefined` |
| 交换完成前校验图书归属 | `routes/swaps.js` | 防止交换期间图书被卖掉或换走 |
| 删除回复时同步递减 `reply_count` | `routes/forum.js` | 原来回复数只增不减 |

## 三、配置与工程规范

| 改动 | 位置 | 原因 |
|---|---|---|
| 新增 `config.js`，真正读取 `.env` | `server/config.js`、`db.js`、`index.js` | 原来文档让配置 `.env`，但项目没有 dotenv，改了也不生效 |
| `JWT_SECRET` 生产环境缺失时拒绝启动 | `server/config.js` | 原来密钥硬编码在代码里 |
| `init-db.js` 支持环境变量与自定义库名 | `server/init-db.js` | 原来写死 `root/root` 和 `shuyi`，无法在测试库上初始化 |
| 统一建库入口，删除两份过期 SQL dump | `server/init.sql`、`server/shuyi.sql` | 三套建库方式互相矛盾（6 表 / 10 表 / 11 表） |
| 删除一次性修复脚本 | `server/seed.js`、`fix-books-json.js`、`fix-sales.js` | 功能重复或只对当时数据有效 |
| 删除未使用的依赖 | `package.json`、`server/package.json` | 前端 `tesseract.js`（OCR 实验遗留）、后端 `canvas`（未使用且需要本地编译） |
| 移除 oxlint 与 ESLint 的耦合 | `eslint.config.js`、`.oxlintrc.json` | 配置引用了未安装的 `eslint-plugin-oxlint`，导致 `npm run lint` 直接报错；统一用 ESLint |
| 修复静态检查问题 | 多个 `src/**/*.vue`、`server/**` | 清理未使用的 import / 变量，`npm run lint` 从 67 个错误降到 0 |
| 删除重复的旧填充脚本 | `server/seed-data.js` | 无任何引用，且文件为 GBK 编码，内容与 `init-db.js` 重复 |
| 删除 OCR 识别库与问答脚本 | `chi_sim.traineddata`、`make-statement.mjs` | 与项目功能无关，不应出现在仓库里 |
| 上传目录只保留占位文件 | `server/uploads/.gitkeep` | 避免把用户上传的图片提交到仓库 |
| DevTools 仅开发环境启用 | `vite.config.js` | 避免调试插件被打进生产包 |
| 统一 `package.json` 命名与 scripts | 两个 `package.json` | 原名 `admin-front` 与实际项目不符；补充 `smoke`、`recalc-sales` 脚本 |

## 四、文档与测试

| 新增 | 说明 |
|---|---|
| `README.md` 重写 | 功能、架构、启动步骤、环境变量、账号、测试、安全设计、已知限制 |
| `docs/API.md` | 40+ 接口的权限、参数、状态机说明 |
| `docs/RESUME.md` | 简历 bullet 草稿 + 面试追问清单 |
| `server/scripts/smoke.mjs` | 57 项接口冒烟断言，自带测试数据并自动清理 |
| `.github/workflows/ci.yml` | GitHub Actions：前端 lint + 构建、后端依赖安装与语法检查 |
| `LICENSE` | MIT |

## 五、如何回滚

本次改造没有修改表结构，回滚只需把代码恢复即可：

```bash
# 如果初始化过测试库
DROP DATABASE shuyi_test;
```

真实库 `shuyi` 未做任何写操作；如需把历史销量对齐到新口径，先预览再执行：

```bash
cd server
DB_NAME=shuyi npm run recalc-sales          # 只看差异
DB_NAME=shuyi npm run recalc-sales -- --apply
```
