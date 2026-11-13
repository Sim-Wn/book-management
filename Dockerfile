# 生产镜像：构建前端 + 安装后端依赖，由 Express 同时托管静态资源
FROM node:22-alpine

WORKDIR /app

# 先装依赖，利用镜像层缓存
COPY package.json package-lock.json ./
RUN npm ci
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev

# 拷贝源码并构建前端
COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server/index.js"]
