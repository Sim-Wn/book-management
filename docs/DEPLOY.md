# 部署指南

项目有两种运行方式：开发模式（两个进程）和生产模式（一个进程托管前后端）。对外提供访问用后者。

## 方式一：局域网访问（最快，适合演示）

同一 Wi-Fi 下的手机或另一台电脑可以直接打开：

1. 双击 `启动-生产.bat`（首次会自动构建）
2. 在浏览器访问 `http://<本机 IP>:3000`，例如 `http://172.28.128.72:3000`
3. 查本机 IP：`ipconfig`，看「无线局域网适配器 WLAN」下的 IPv4 地址
4. Windows 防火墙需要放行 3000 端口（管理员 PowerShell）：

```powershell
netsh advfirewall firewall add rule name="Shuyi 3000" dir=in action=allow protocol=TCP localport=3000
```

> 注意：如果连的是公司/学校网络，可能开启了客户端隔离，设备之间无法互访；换手机热点即可。

## 方式二：云服务器（推荐长期使用）

以 Ubuntu 22.04、2 核 2G 为例：

```bash
# 1. 安装 Node 20、MySQL、Nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs mysql-server nginx
sudo mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '你的密码';"

# 2. 拉代码并安装依赖
cd /var/www && sudo git clone <你的仓库地址> shuyi && cd shuyi
npm ci
cd server && npm ci && cd ..

# 3. 配置环境变量
cd server
cp .env.example .env
# 编辑 .env：DB_PASSWORD、JWT_SECRET（务必改）、CORS_ORIGINS=https://你的域名
node init-db.js     # 首次初始化，会重建表

# 4. 构建并启动
cd ..
npm run build
npm i -g pm2
pm2 start server/index.js --name shuyi
pm2 save && pm2 startup
```

Nginx 反向代理（`/etc/nginx/sites-available/shuyi`）：

```nginx
server {
  listen 80;
  server_name 你的域名;

  client_max_body_size 10m;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/shuyi /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d 你的域名     # 自动配置 HTTPS
```

上线后检查清单：

- [ ] `JWT_SECRET` 已改为随机长字符串
- [ ] `CORS_ORIGINS` 只包含正式域名
- [ ] 管理员默认密码已修改
- [ ] `server/uploads` 已做持久化/备份（或换对象存储）
- [ ] MySQL 3306 不对公网开放
- [ ] 已配置数据库定时备份

## 方式三：Railway（推荐，最快）

1. 先把仓库推到 GitHub
2. Railway → **New Project → Deploy from GitHub repo**，选中仓库
   （仓库里有 `railway.json`，构建/启动命令和健康检查已配好，不用手填）
3. 在项目里 **Add → Database → MySQL**
4. 打开应用服务的 **Variables**，添加：

| 变量 | 值 |
|---|---|
| `MYSQL_URL` | `${{MySQL.MYSQL_URL}}`（引用 MySQL 服务的连接串） |
| `JWT_SECRET` | 随机 32 位以上字符串 |
| `CORS_ORIGINS` | 部署出来的域名，例如 `https://shuyi-production.up.railway.app` |

> 后端已支持 `MYSQL_URL` / `DATABASE_URL`，会自动解析成 host/port/user/password/database，不需要再手填 5 个变量。

5. **Settings → Networking → Generate Domain**，拿到公网地址
6. 首次部署完成后，在服务 **Shell** 里初始化数据库：
   ```bash
   cd server && node init-db.js
   ```
7. 打开域名，用 `admin / 123456` 登录后立刻改密码

> 免费额度有限，长时间不用会休眠；演示够用。上传的图片存在容器磁盘，重新部署会丢，正式用建议挂 Volume 或换对象存储。

## 方式三补充：Render（可零成本，但会休眠）

1. Railway 之外的选择：Render 新建 **Web Service**，连接 GitHub 仓库
2. Build Command：`npm ci && cd server && npm ci && cd .. && npm run build`
3. Start Command：`node server/index.js`
4. 数据库用外部免费 MySQL（Aiven / TiDB Cloud），把连接串填到 `DATABASE_URL`
5. 另外设置 `JWT_SECRET`、`CORS_ORIGINS`
6. 部署后在 Render Shell 执行 `cd server && node init-db.js`

## 方式四：Docker Compose（VPS 一键）

仓库自带 `Dockerfile` 和 `docker-compose.yml`：

```bash
docker compose up -d --build

# 首次初始化数据库（会重建表，确认是空库再执行）
docker compose run --rm app node server/init-db.js
```

访问 `http://服务器IP:3000`。

`docker-compose.yml` 里已经把上传目录挂载为卷，数据库数据在 `db` 卷中；改 `JWT_SECRET` 和 `CORS_ORIGINS` 后再上线。

## 环境变量速查

| 变量 | 生产建议 |
|---|---|
| `JWT_SECRET` | 32 位以上随机字符串，必须设置 |
| `CORS_ORIGINS` | 只写正式域名，逗号分隔 |
| `DB_*` | 使用独立数据库账号，不要用 root |
| `MYSQL_URL` / `DATABASE_URL` | 云平台连接串；存在时自动解析，优先级低于单独设置的 `DB_*` |
| `BOOK_REVIEW` | 保持 1，用户发书先审核 |
| `PORT` | 反向代理后一般保持 3000 |
