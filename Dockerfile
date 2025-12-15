# 多阶段构建 - Stage 1: 构建前端
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# 复制前端依赖文件
COPY frontend/package*.json ./

# 安装前端依赖
RUN npm install

# 复制前端源代码
COPY frontend/ ./

# 构建前端静态文件
RUN npm run build

# 多阶段构建 - Stage 2: 构建后端运行环境
FROM node:18-alpine

WORKDIR /app

# 安装生产依赖
COPY backend/package*.json ./
RUN npm install --production

# 复制后端源代码
COPY backend/ ./

# 从前端构建阶段复制构建产物
COPY --from=frontend-builder /app/frontend/dist ./public

# 创建数据目录
RUN mkdir -p /app/data

# 暴露端口
EXPOSE 5143

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=5143

# 启动应用
CMD ["node", "src/server.js"]
