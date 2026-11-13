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

## 方式三：PaaS（Railway / Render）

适合不想维护服务器的情况：

1. 把仓库推到 GitHub
2. Railway 新建项目 → Deploy from GitHub
3. 添加 MySQL 插件，把 `DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME` 注入到应用环境变量
4. 设置：
   - Build Command：`npm ci && cd server && npm ci && cd .. && npm run build`
   - Start Command：`node server/index.js`
   - 环境变量：`JWT_SECRET`、`CORS_ORIGINS=https://你的域名`
5. 首次部署后，在 Railway 的 Shell 里执行 `cd server && node init-db.js`

> 免费套餐通常会休眠，第一次访问可能较慢；生产使用建议付费实例。

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
| `BOOK_REVIEW` | 保持 1，用户发书先审核 |
| `PORT` | 反向代理后一般保持 3000 |
