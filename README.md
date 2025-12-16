<div align="center">

# ☁️ Cloud

flare Manager

**一站式 Cloudflare 资源管理平台**  
轻松管理 Workers、KV、D1、DNS 和 Pages

[![Docker Hub](https://img.shields.io/badge/Docker%20Hub-binbankm%2Fcf--manager-blue?logo=docker)](https://hub.docker.com/r/binbankm/cf-manager)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js)](https://nodejs.org/)

[功能特性](#-功能特性) • [快速开始](#-快速开始) • [开发指南](#-开发指南) • [部署指南](#-生产环境部署)

</div>

---

## ✨ 功能特性

### 核心功能

| 模块 | 功能描述 |
|------|---------|
| 🚀 **Workers** | 在线编辑、部署和管理 Cloudflare Workers 脚本<br/>• Monaco Editor 代码高亮<br/>• 环境变量/KV/D1 绑定配置<br/>• 一键部署和版本管理 |
| 🗄️ **KV 存储** | 可视化管理 KV 命名空间和键值对<br/>• 批量导入/导出 JSON 数据<br/>• 键名搜索和批量删除<br/>• 支持大文本值编辑 |
| 💾 **D1 数据库** | 查看和管理 D1 SQL 数据库<br/>• 列出所有数据库实例<br/>• Workers 绑定配置<br/>• 数据库元信息查看 |
| 🌐 **DNS 管理** | 完整的域名 DNS 记录管理<br/>• 支持所有常见记录类型（A/AAAA/CNAME/MX/TXT等）<br/>• 批量导入/导出 BIND 格式<br/>• Cloudflare 代理状态切换 |
| 📄 **Pages 项目** | 管理 Cloudflare Pages 部署<br/>• 查看部署历史<br/>• 项目状态监控<br/>• 快速访问预览链接 |

### 技术特性

- 🔐 **安全可靠**: JWT 认证 + AES-256 加密存储 API Token
- 🎨 **现代UI**: React 18 + TailwindCSS 响应式设计
- ⚡ **高性能**: 懒加载 + React.memo 优化，页面切换流畅
- 🐳 **容器化**: 开箱即用的 Docker 镜像
- 💾 **轻量级**: SQLite 数据库，无需额外依赖
- 🌍 **多账号**: 支持管理多个 Cloudflare 账号

---

## 🚀 快速开始

### 前置要求

- [Docker](https://docs.docker.com/get-docker/) 20.10+
- [Docker Compose](https://docs.docker.com/compose/install/) 2.0+

### 方法一：一键部署（推荐）

```bash
# 下载部署脚本
wget https://raw.githubusercontent.com/binbankm/CF-Manager/main/deploy.sh

# 或使用 curl
curl -O https://raw.githubusercontent.com/binbankm/CF-Manager/main/deploy.sh

# 运行部署
# 脚本会自动下载 docker-compose.yml 等必要文件，并完成配置和启动
chmod +x deploy.sh
./deploy.sh
```

> 💡 **提示**: deploy.sh 会自动下载 `docker-compose.yml` 和 `.env.example`，无需手动准备其他文件

### 方法二：手动部署

```bash
# 1. 下载配置文件
wget https://raw.githubusercontent.com/binbankm/CF-Manager/main/docker-compose.yml
wget https://raw.githubusercontent.com/binbankm/CF-Manager/main/.env.example

# 2. 配置环境变量
cp .env.example .env

# 生成安全密钥
echo "JWT_SECRET=$(openssl rand -base64 48)" >> .env
echo "ENCRYPTION_KEY=$(openssl rand -hex 16)" >> .env

# 3. 启动应用
docker compose up -d
```

### 访问应用

部署完成后访问：**http://localhost:5143**

默认端口：`5143`  
健康检查：http://localhost:5143/api/health

---

## ⚙️ 配置说明

### 环境变量

编辑 `.env` 文件配置以下变量：

| 变量 | 说明 | 必需 | 默认值 | 生成方法 |
|------|------|:----:|--------|----------|
| `JWT_SECRET` | JWT 签名密钥 | ✅ | - | `openssl rand -base64 48` |
| `ENCRYPTION_KEY` | API Token 加密密钥（32字符） | ✅ | - | `openssl rand -hex 16` |
| `PORT` | 应用端口 | ❌ | `5143` | - |
| `NODE_ENV` | 运行环境 | ❌ | `production` | - |
| `LOG_LEVEL` | 日志级别 | ❌ | `info` | `debug/info/warn/error` |
| `DATABASE_PATH` | 数据库路径 | ❌ | `/app/data/database.sqlite` | - |

> ⚠️ **安全提示**: 生产环境必须使用强随机密钥，不要使用默认值！

### 端口配置

修改 `docker-compose.yml`：

```yaml
# 默认配置（所有网络接口可访问）
ports:
  - "5143:5143"

# 推荐配置（仅本地访问，通过反向代理暴露）
ports:
  - "127.0.0.1:5143:5143"
```

### 数据持久化

所有数据存储在 `./data` 目录：

```
CF-Manager/
├── data/
│   └── database.sqlite  # SQLite 数据库
├── docker-compose.yml
└── .env
```

---

## 📝 使用指南

### 首次使用

1. **注册账号**: 访问应用首页，注册管理员账号
2. **添加 Cloudflare 账号**: 
   - 登录后点击"添加账号"
   - 输入 Cloudflare API Token（[获取方式](#如何获取-cloudflare-api-token)）
3. **开始管理**: 选择账号后即可管理各类资源

### Workers 使用

```javascript
// 1. 创建 Worker
点击"添加Worker" → 输入名称 → 创建

// 2. 编辑代码
选择 Worker → 点击"编辑" → 在 Monaco Editor 中编辑

// 3. 配置绑定
切换到"变量设置" → 添加环境变量/KV/D1绑定

// 4. 部署
点击"部署"按钮 → 确认发布
```

### KV 存储使用

```bash
# 批量导入数据
1. 点击"导入"按钮
2. 粘贴 JSON 数据（格式：[{key, value, metadata}]）
3. 确认导入

# 批量导出
点击"导出"按钮 → 自动下载 JSON 文件
```

### DNS 管理

```bash
# 导入 BIND 格式记录
1. 导出现有 DNS（从 Cloudflare Dashboard 或其他 DNS 服务）
2. 点击"导入记录"
3. 上传 BIND 格式文件
4. 确认导入
```

---

## 🛠️ 常用命令

```bash
# 查看运行状态
docker compose ps

# 查看实时日志
docker compose logs -f

# 仅查看应用日志
docker compose logs -f cf-manager

# 重启服务
docker compose restart

# 停止服务
docker compose down

# 更新到最新版本
docker compose pull
docker compose up -d

# 完全卸载（包括数据）
docker compose down -v
rm -rf data

# 备份数据库
cp ./data/database.sqlite ./data/backup-$(date +%Y%m%d).sqlite

# 查看容器资源使用
docker stats cf-manager
```

---

## 🔒 生产环境部署

### 1. 使用反向代理（推荐）

#### Nginx 配置

```nginx
server {
    listen 80;
    server_name cf-manager.yourdomain.com;

    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name cf-manager.yourdomain.com;

    # SSL 证书（Let's Encrypt）
    ssl_certificate /etc/letsencrypt/live/cf-manager.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cf-manager.yourdomain.com/privkey.pem;

    # SSL 配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://127.0.0.1:5143;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket 支持（如果需要）
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

#### Caddy 配置（更简单）

```caddy
cf-manager.yourdomain.com {
    reverse_proxy localhost:5143
}
```

### 2. 启用 HTTPS

```bash
# 使用 Certbot 自动配置 SSL（Nginx）
sudo certbot --nginx -d cf-manager.yourdomain.com

# Caddy 自动管理 SSL，无需手动配置
```

### 3. 限制端口访问

修改 `docker-compose.yml`：

```yaml
ports:
  - "127.0.0.1:5143:5143"  # 只允许本地访问
```

### 4. 定期备份

创建备份脚本 `backup.sh`：

```bash
#!/bin/bash
BACKUP_DIR=~/cf-manager-backups
mkdir -p $BACKUP_DIR

# 备份数据库
cp ./data/database.sqlite $BACKUP_DIR/db-$(date +%Y%m%d_%H%M%S).sqlite

# 备份配置
cp .env $BACKUP_DIR/env-$(date +%Y%m%d_%H%M%S).backup

# 清理旧备份（保留最近7天）
find $BACKUP_DIR -name "db-*" -mtime +7 -delete
find $BACKUP_DIR -name "env-*" -mtime +7 -delete

echo "备份完成: $BACKUP_DIR"
```

添加定时任务（每天凌晨 2 点）：

```bash
chmod +x backup.sh
crontab -e
# 添加以下行：
0 2 * * * /path/to/cf-manager/backup.sh >> /var/log/cf-manager-backup.log 2>&1
```

### 5. 监控和日志

```bash
# 使用 Docker 日志驱动
# 在 docker-compose.yml 中添加：
services:
  cf-manager:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

---

## 💻 开发指南

### 本地开发环境

#### 1. 克隆仓库

```bash
git clone https://github.com/binbankm/CF-Manager.git
cd CF-Manager
```

#### 2. 后端开发

```bash
cd backend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 启动开发服务器
npm run dev
```

后端 API: http://localhost:5143

#### 3. 前端开发

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端应用: http://localhost:3000

### 技术栈

**后端**
- Node.js 18+ + Express
- SQLite3 + Sequelize ORM
- JWT 认证
- AES-256 加密
- Cloudflare API SDK

**前端**
- React 18 + Vite
- TailwindCSS
- Monaco Editor（代码编辑器）
- Zustand（状态管理）
- React Router v6
- Axios

### 项目结构

```
CF-Manager/
├── backend/                 # 后端 API
│   ├── src/
│   │   ├── config/         # 配置文件
│   │   ├── models/         # 数据模型
│   │   ├── routes/         # API 路由
│   │   ├── services/       # 业务逻辑
│   │   └── server.js       # 入口文件
│   └── package.json
├── frontend/                # 前端应用
│   ├── src/
│   │   ├── components/     # React 组件
│   │   ├── pages/          # 页面组件
│   │   ├── services/       # API 调用
│   │   ├── store/          # 状态管理
│   │   └── main.jsx        # 入口文件
│   └── package.json
├── data/                    # 数据目录（开发+生产）
│   └── database.sqlite
├── docker-compose.yml       # Docker Compose 配置
├── Dockerfile              # Docker 镜像构建
├── deploy.sh               # 一键部署脚本
└── README.md
```

### 构建 Docker 镜像

```bash
# 从源码构建
docker build -t cf-manager:latest .

# 或使用 docker compose
docker compose build
```

---

## 🐛 故障排查

### 容器无法启动

```bash
# 查看详细日志
docker compose logs -f

# 检查端口占用
sudo netstat -tulpn | grep 5143
# 或
sudo lsof -i :5143

# 检查 Docker 磁盘空间
docker system df
```

### 数据库连接失败

```bash
# 检查数据目录权限
ls -la ./data

# 检查数据库文件
sqlite3 ./data/database.sqlite ".tables"

# 重新初始化数据库
docker compose down
rm -f ./data/database.sqlite
docker compose up -d
```

### API 请求失败

1. 检查 Cloudflare API Token 权限
2. 查看后端日志: `docker compose logs backend`
3. 验证环境变量配置
4. 检查网络连接

### 性能问题

```bash
# 查看容器资源使用
docker stats cf-manager

# 如果内存不足，可以限制资源
# 编辑 docker-compose.yml 添加：
deploy:
  resources:
    limits:
      cpus: '1.0'
      memory: 1024M
```

### 重置所有数据

⚠️ **警告**: 此操作会删除所有数据！

```bash
docker compose down
rm -rf ./data
docker compose up -d
```

---

## ❓ 常见问题

<details>
<summary><strong>如何获取 Cloudflare API Token？</strong></summary>

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 点击右上角头像 → My Profile
3. 左侧菜单选择 "API Tokens"
4. 点击 "Create Token"
5. 选择模板或自定义权限：
   - **Account** → Workers Scripts → Edit
   - **Account** → Workers KV Storage → Edit
   - **Account** → D1 → Edit
   - **Zone** → DNS → Edit
   - **Zone** → Workers Routes → Edit
6. 复制生成的 Token

</details>

<details>
<summary><strong>支持哪些 Cloudflare 服务？</strong></summary>

目前支持：
- ✅ Workers（脚本管理、部署、绑定配置）
- ✅ KV Storage（命名空间、键值对管理）
- ✅ D1 Database（数据库列表、绑定）
- ✅ DNS Records（所有记录类型）
- ✅ Pages（项目列表、部署历史）

计划支持：
- ⏳ R2 Storage
- ⏳ Stream视频
- ⏳ Images 优化

</details>

<details>
<summary><strong>数据存储在哪里？是否安全？</strong></summary>

**存储位置**: 
- 开发环境：`CF-Manager/data/database.sqlite`
- Docker环境：容器内 `/app/data/database.sqlite`（挂载自 `./data`）

**安全措施**:
1. Cloudflare API Token 使用 AES-256 加密存储
2. 用户密码使用 bcrypt 哈希
3. JWT Token 有效期控制
4. 建议定期备份数据库文件

**备份建议**:
```bash
# 手动备份
cp ./data/database.sqlite ./backups/db-$(date +%Y%m%d).sqlite

# 自动备份（添加到 crontab）
0 2 * * * /path/to/backup.sh
```

详见: [DATA_DIRECTORY.md](DATA_DIRECTORY.md)

</details>

<details>
<summary><strong>如何更新到最新版本？</strong></summary>

```bash
# 拉取最新镜像
docker compose pull

# 重启容器
docker compose up -d

# 查看版本
docker compose logs | head -20
```

**注意**: 更新前建议备份数据库

</details>

<details>
<summary><strong>是否支持多用户？</strong></summary>

是的，支持多用户注册和独立管理各自的 Cloudflare 账号。

每个用户可以：
- 独立注册和登录
- 管理多个 Cloudflare 账号
- 数据完全隔离

</details>

<details>
<summary><strong>忘记密码怎么办？</strong></summary>

目前版本暂不支持密码重置功能。解决方案：

1. **重新注册**（如果可以）
2. **重置数据库**（会丢失所有数据）：
   ```bash
   docker compose down
   rm -f ./data/database.sqlite
   docker compose up -d
   ```
3. **手动修改数据库**（需要 SQL 知识）

计划在后续版本添加密码重置功能。

</details>

<details>
<summary><strong>能否在 Windows 上运行？</strong></summary>

可以！需要：
1. 安装 [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop)  
2. 在 PowerShell 或 CMD 中运行：
   ```powershell
   docker compose up -d
   ```
3. 访问 http://localhost:5143

**注意**: Windows 下deploy.sh脚本需要在 WSL2 或 Git Bash 中运行。

</details>

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 贡献流程

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 提交 Pull Request

### 开发规范

- 代码风格：遵循 ESLint 配置
- 提交信息：使用语义化提交信息
- 测试：确保功能正常运行
- 文档：更新相关文档

---

## 📄 开源协议

本项目基于 [MIT License](LICENSE) 开源

---

## ⭐ Star History

如果这个项目对您有帮助，请考虑给个 Star ⭐

[![Star History Chart](https://api.star-history.com/svg?repos=binbankm/CF-Manager&type=Date)](https://star-history.com/#binbankm/CF-Manager&Date)

---

## 📮 联系方式

- 提交问题: [GitHub Issues](https://github.com/binbankm/CF-Manager/issues)
- 功能建议: [GitHub Discussions](https://github.com/binbankm/CF-Manager/discussions)
- 邮箱: your-email@example.com

---

<div align="center">

**Made with ❤️ for Cloudflare Developers**

[GitHub](https://github.com/binbankm/CF-Manager) • [Docker Hub](https://hub.docker.com/r/binbankm/cf-manager) • [文档](https://github.com/binbankm/CF-Manager/wiki)

</div>
