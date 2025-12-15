# Cloudflare Manager

一个现代化的 Cloudflare 资源管理平台，支持 Workers、KV、D1、DNS 和 Pages 的统一管理。

## ✨ 功能特性

- 🚀 **Workers 管理** - 在线编辑、部署和管理 Cloudflare Workers
- 🗄️ **KV 存储** - 可视化管理 KV 命名空间和键值对
- 💾 **D1 数据库** - 查看和绑定 D1 SQL 数据库
- 🌐 **DNS 管理** - 完整的 DNS 记录管理功能
- 📄 **Pages 管理** - 管理 Cloudflare Pages 项目和部署
- 🔐 **安全认证** - JWT 认证 + API Token 加密存储
- 🎨 **现代界面** - 基于 React 的响应式 UI

## 🚀 快速部署

### 前置要求
- Docker (20.10+)
- Docker Compose (1.29+)

### 方法 1: 一键部署（推荐）

```bash
# 克隆项目
git clone https://github.com/your-username/CF-Manager.git
cd CF-Manager

# 运行部署脚本
chmod +x deploy.sh
./deploy.sh
```

### 方法 2: 手动部署

```bash
# 1. 配置环境变量
cp .env.example .env

# 2. 生成安全密钥
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
echo "ENCRYPTION_KEY=$(openssl rand -hex 16)" >> .env

# 3. 启动应用
docker compose up -d

# 4. 查看日志
docker compose logs -f
```

### 方法 3: 仅使用 docker-compose.yml 部署

如果您只有 `docker-compose.yml` 文件：

```bash
# 创建 .env 文件
cat > .env << EOF
JWT_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -hex 16)
NODE_ENV=production
PORT=5143
EOF

# 启动应用
docker compose up -d
```

## 🌐 访问应用

部署完成后，访问：
- **本地**: http://localhost:5143
- **健康检查**: http://localhost:5143/api/health

## 📋 环境变量配置

| 变量名 | 说明 | 必需 | 默认值 |
|--------|------|------|--------|
| `JWT_SECRET` | JWT 签名密钥 | ✅ | - |
| `ENCRYPTION_KEY` | API Token 加密密钥（32字符） | ✅ | - |
| `NODE_ENV` | 运行环境 | ❌ | production |
| `PORT` | 应用端口 | ❌ | 5143 |
| `DATABASE_PATH` | 数据库路径 | ❌ | /app/data/database.sqlite |
| `LOG_LEVEL` | 日志级别 | ❌ | info |

### 生成安全密钥

```bash
# 生成 JWT_SECRET
openssl rand -base64 32

# 生成 ENCRYPTION_KEY (必须32字符)
openssl rand -hex 16
```

## 🔧 常用命令

```bash
# 查看容器状态
docker compose ps

# 查看日志
docker compose logs -f

# 重启应用
docker compose restart

# 停止应用
docker compose down

# 更新到最新版本
docker compose pull
docker compose up -d

# 备份数据
cp ./data/database.sqlite ./data/database.sqlite.backup
```

## 🔒 生产环境部署建议

### 1. 配置 Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5143;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2. 启用 HTTPS

```bash
# 使用 Certbot 自动配置 SSL
sudo certbot --nginx -d your-domain.com
```

### 3. 限制端口访问

修改 `docker-compose.yml`:
```yaml
ports:
  - "127.0.0.1:5143:5143"  # 只允许本地访问
```

### 4. 配置自动备份

```bash
# 创建备份脚本
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR=~/cf-manager-backups
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d_%H%M%S)
cp ./data/database.sqlite $BACKUP_DIR/database_$DATE.sqlite
find $BACKUP_DIR -name "database_*.sqlite" -mtime +7 -delete
EOF

chmod +x backup.sh

# 添加定时任务（每天凌晨2点）
(crontab -l 2>/dev/null; echo "0 2 * * * ~/CF-Manager/backup.sh") | crontab -
```

## 📚 更多文档

- [VPS 部署指南](./docs/vps-deployment.md)
- [Docker 镜像发布指南](./docs/docker-publishing.md)
- [API 文档](./docs/api.md)

## 🛠️ 技术栈

### 后端
- Node.js + Express
- SQLite3 + Sequelize ORM
- JWT 认证
- Cloudflare API 集成

### 前端
- React 18
- Vite
- TailwindCSS
- Monaco Editor
- Lucide Icons

## 📝 开源协议

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## ⚠️ 重要提示

- **安全**: 生产环境必须修改 `.env` 中的密钥
- **备份**: 定期备份 `./data/database.sqlite`
- **更新**: 使用 `docker compose pull` 获取最新版本
- **网络**: 建议配置反向代理和 HTTPS

## 📞 支持

如有问题，请通过以下方式联系：
- GitHub Issues
- Email: your-email@example.com

---

**Made with ❤️ for Cloudflare Developers**
