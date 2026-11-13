# 接口文档

- **Base URL**：`http://localhost:3000/api`
- **认证方式**：`Authorization: Bearer <token>`，token 由登录接口签发，有效期 7 天
- **返回约定**：成功返回 JSON 数据或 `{ "ok": true, ... }`；失败返回 `{ "ok": false, "msg": "..." }`
- **状态码**：`400` 参数错误 / `401` 未登录或 token 失效 / `403` 无权限 / `404` 资源不存在 / `429` 请求过于频繁 / `500` 服务器错误

## 认证

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| POST | `/auth/login` | 公开 | 登录，返回 `token`、`role`、`user`；同 IP + 账号 10 次/分钟 |
| POST | `/auth/register` | 公开 | 注册，用户名 2-20 位中英文/数字/下划线，密码 ≥ 6 位 |
| GET | `/auth/me` | 登录 | 用 token 换取最新用户信息 |
| PUT | `/auth/profile` | 登录 | 修改本人资料，同步更新图书与消息里的用户名 |
| GET | `/auth/users` | 管理员 | 用户列表 |
| PUT | `/auth/users/:id/toggle` | 管理员 | 禁用 / 启用用户，禁用时下架其在售图书 |
| DELETE | `/auth/users/:id` | 管理员 | 删除用户，其在售图书改为已下架 |

## 统计

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| GET | `/stats` | 公开 | 在售图书数、分类数、有效用户数、订单数 |

## 图书

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| GET | `/books` | 公开 | 列表，支持 `category`、`keyword`、`sort`（`price-asc` / `price-desc` / `sales` / `new`）、`status`、`seller_name`；带 `page` / `pageSize` 时返回 `{ items, total, page, pageSize }`，否则返回数组 |
| GET | `/books/categories` | 公开 | 数据库中已有的分类名列表 |
| GET | `/books/:id` | 公开 | 详情 |
| GET | `/books/cover/:id` | 公开 | 动态生成的 SVG 封面（无图片时兜底） |
| POST | `/books` | 登录 | 发布图书，`seller_id` 取 token；需要审核时初始状态为「待审核」 |
| PUT | `/books/:id` | 本人或管理员 | 卖家可改内容与在售/下架，不能自行审核或改为其他状态 |
| DELETE | `/books/:id` | 本人或管理员 | 删除图书 |
| GET | `/books/:id/favorites` | 本人或管理员 | 某用户的收藏 ID 列表（`:id` 为用户 ID） |
| POST | `/books/:id/favorite` | 本人 | body：`{ bookId, add }` |
| GET | `/books/:id/rating` | 公开 | 平均分、评分人数、`?user_id=` 时返回我的评分 |
| GET | `/books/:id/reviews` | 公开 | 带文字内容的评价列表（最多 20 条） |
| POST | `/books/:id/rate` | 登录 | body：`{ score: 1-5, comment?: string }`，每人每书一条，重复提交即修改 |

## 订单

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| POST | `/orders` | 登录 | body：`{ address, phone, remark?, items: [{ book_id, quantity }] }` |
| GET | `/orders` | 登录 | 普通用户返回自己的订单；带 `role=seller` 返回「别人买我的书」；管理员可查全部或按 `user_id` 过滤 |
| GET | `/orders/:id` | 登录 | 订单详情（买家 / 卖家 / 管理员），含明细与买家信息 |
| PUT | `/orders/:id/status` | 买家 / 卖家 / 管理员 | body：`{ status }`，走状态机校验 |
| POST | `/orders/:id/pay` | 买家 / 管理员 | 待付款 → 待发货 |
| POST | `/orders/:id/cancel` | 买家 / 管理员 | 待付款、待发货 → 已取消，回滚库存 |
| POST | `/orders/:id/receive` | 买家 / 管理员 | 已发货 → 已签收 |
| POST | `/orders/:id/refund` | 买家 / 管理员 | 已签收 → 申请退货 |

**下单规则**

- 只接收 `book_id` 和数量，**单价、总价、卖家全部由服务端查询数据库计算**；
- 一次只能购买同一个卖家的图书；
- 图书必须处于「在售」且库存充足；
- 下单即扣库存，订单完成才累加销量。

**状态机**

```
待付款 → 待发货 → 已发货 → 已签收 → 已完成
   ↓        ↓                  ↓
 已取消   已取消            申请退货 → 退货中 → 已退货
```

## 分类

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| GET | `/categories` | 公开 | 分类列表（含图标与排序） |
| POST / PUT / DELETE | `/categories`、`/categories/:id` | 管理员 | 增改删 |

## 交换

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| POST | `/swaps` | 登录 | 发起交换，只能用自己「在售」的书；平台自营图书不支持交换 |
| GET | `/swaps` | 登录 | 与我相关的交换；管理员可查全部 |
| PUT | `/swaps/:id/status` | 参与者 / 管理员 | `待确认 → 已同意 → 已完成`；完成时两本书归属互换 |
| POST | `/swaps/:id/agree` | 参与者 | 单人确认，双方都确认后自动变为「已同意」 |
| POST | `/swaps/:id/reject` | 参与者 | 待确认 → 已拒绝 |
| PUT | `/swaps/:id/admin-force-status` | 管理员 | 强制修改状态 |

## 消息

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| GET | `/messages` | 登录 | 普通用户只看与自己相关的消息；管理员可看全部，支持 `order_id` / `swap_id` / `user_id` 过滤 |
| GET | `/messages/conversations` | 登录 | 会话列表，含未读数；`user_id` 只能是本人（管理员除外） |
| GET | `/messages/pm` | 登录 | 两人私信记录，只能查询自己参与的会话 |
| POST | `/messages` | 登录 | body：`{ order_id?, swap_id?, receiver_id?, content }`，发送者取 token |
| PUT | `/messages/read` | 登录 | 将「发给我的」消息标记已读 |

## 论坛

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| GET | `/forum/posts` | 公开 | 帖子列表，置顶优先；支持 `keyword`、`user_id`（我的帖子）、`page` / `pageSize` |
| GET | `/forum/posts/:id` | 公开 | 详情 + 回复，访问计数 +1 |
| POST | `/forum/posts` | 登录 | 发帖 |
| PUT / DELETE | `/forum/posts/:id` | 作者 / 管理员 | 编辑 / 删除 |
| POST | `/forum/posts/:id/replies` | 登录 | 回复，回复数 +1 |
| DELETE | `/forum/replies/:id` | 作者 / 管理员 | 删除回复，回复数 -1 |

## 上传

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| POST | `/upload` | 登录 | `multipart/form-data`，字段名 `file`，≤ 5MB，jpg/png/gif/webp/bmp |

服务端会用 Sharp 将图片压缩为最长边 1200px 的 JPEG，返回 `{ ok: true, url: "/uploads/xxx.jpg" }`。

## 其他

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| GET | `/health` | 公开 | 健康检查，返回 `{ ok: true }` |
