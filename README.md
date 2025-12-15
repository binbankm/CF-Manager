<div align="center">

# ☁️ Cloudflare Manager

**一站式 Cloudflare 资源管理平台**

[![Docker Hub](https://img.shields.io/badge/Docker%20Hub-binbankm%2Fcf--manager-blue?logo=docker)](https://hub.docker.com/r/binbankm/cf-manager)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[功能特性](#-功能特性) • [快速开始](#-快速开始) • [配置说明](#-配置说明) • [常用命令](#-常用命令)

</div>

---

## ✨ 功能特性

- 🚀 **Workers** - 在线编辑、部署和管理 Cloudflare Workers 脚本
- 🗄️ **KV 存储** - 可视化管理 KV 命名空间和键值对数据
- 💾 **D1 数据库** - 查看和绑定 D1 SQL 数据库
- 🌐 **DNS 记录** - 完整的域名 DNS 记录管理
- 📄 **Pages 项目** - 管理 Cloudflare Pages 部署
- 🔐 **安全认证** - JWT 认证 + API Token 加密存储
- 🎨 **现代 UI** - 响应式设计，支持代码高亮编辑

---

## 🚀 快速开始

### 前置要求

- [Docker](https://docs.docker.com/get-docker/) 20.10+
- [Docker Compose](https://docs.docker.com/compose/install/) 1.29+

### 一键部署

```bash
# 1. 下载部署脚本
wget https://raw.githubusercontent.com/binbankm/CF-Manager/main/deploy.sh

# 2. 运行部署（自动生成密钥并启动）
chmod +x deploy.sh
./deploy.sh
```

### 手动部署

```bash
# 1. 下载配置文件
wget https://raw.githubusercontent.com/binbankm/CF-Manager/main/docker-compose.yml
wget https://raw.githubusercontent.com/binbankm/CF-Manager/main/.env.example

# 2. 配置环境变量
cp .env.example .env

# 生成安全密钥
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
echo "ENCRYPTION_KEY=$(openssl rand -hex 16)" >> .env

# 3. 启动应用
docker compose up -d
```

### 访问应用

部署完成后访问：http://localhost:5143

---

## ⚙️ 配置说明

### 环境变量

编辑 `.env` 文件配置以下变量：

| 变量 | 说明 | 必需 | 示例 |
|------|------|:----:|------|
| `JWT_SECRET` | JWT 签名密钥 | ✅ | `openssl rand -base64 32` |
| `ENCRYPTION_KEY` | API Token 加密密钥（32字符） | ✅ | `openssl rand -hex 16` |
| `PORT` | 应用端口 | ❌ | `5143` |
| `NODE_ENV` | 运行环境 | ❌ | `production` |

⚠️ **安全提示**: 生产环境必须使用强随机密钥，不要使用默认值！

### 端口配置

默认端口为 `5143`。如需修改：

```yaml
# docker-compose.yml
ports:
  - "8080:5143"  # 改为 8080 端口访问
```

---

## � 常用命令

```bash
# 查看运行状态
docker compose ps

# 查看实时日志
docker compose logs -f

# 重启服务
docker compose restart

# 停止服务
docker compose down

# 更新到最新版本
docker compose pull
docker compose up -d

# 备份数据库
cp ./data/database.sqlite ./backup_$(date +%Y%m%d).sqlite
```

---

## 🔒 生产环境部署

### 1. 使用反向代理（推荐）

**Nginx 配置示例：**

```nginx
server {
    listen 80;
    server_name cf-manager.example.com;

    location / {
        proxy_pass http://127.0.0.1:5143;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**启用 HTTPS：**

```bash
# 使用 Certbot 自动配置 SSL
sudo certbot --nginx -d cf-manager.example.com
```

### 2. 限制端口访问

修改 `docker-compose.yml`，仅允许本地访问：

```yaml
ports:
  - "127.0.0.1:5143:5143"  # 只允许 localhost
```

### 3. 定期备份

创建备份脚本：

```bash
#!/bin/bash
# backup.sh
BACKUP_DIR=~/backups
mkdir -p $BACKUP_DIR
cp ./data/database.sqlite $BACKUP_DIR/db_$(date +%Y%m%d_%H%M%S).sqlite
find $BACKUP_DIR -name "db_*.sqlite" -mtime +7 -delete
```

添加定时任务（每天凌晨 2 点）：

```bash
chmod +x backup.sh
(crontab -l 2>/dev/null; echo "0 2 * * * ~/cf-manager/backup.sh") | crontab -
```

---

## � 故障排查

### 容器无法启动

```bash
# 查看详细日志
docker compose logs -f

# 检查端口占用
sudo netstat -tulpn | grep 5143
```

### 重置数据库

⚠️ **警告**: 此操作会删除所有数据！

```bash
docker compose down
rm -f ./data/database.sqlite
docker compose up -d
```

### 忘记密码

目前无法重置密码，需要重新注册或重置数据库。

---

## 🛠️ 技术栈

**后端**
- Node.js + Express
- SQLite3 + Sequelize
- JWT 认证
- Cloudflare API

**前端**
- React 18 + Vite
- TailwindCSS
- Monaco Editor
- Lucide Icons

---

## 📝 开源协议

MIT License - 详见 [LICENSE](LICENSE) 文件

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 提交 Pull Request

---

## � 常见问题

<details>
<summary><strong>如何添加多个 Cloudflare 账号？</strong></summary>

登录后，在账号管理页面点击"添加账号"，输入新的 Cloudflare API Token 即可。

</details>

<details>
<summary><strong>数据存储在哪里？</strong></summary>

所有数据存储在 `./data/database.sqlite` 文件中，建议定期备份。

</details>

<details>
<summary><strong>是否支持多用户？</strong></summary>

是的，支持多用户注册和独立管理各自的 Cloudflare 账号。

</details>

---

## ⭐ Star History

如果这个项目对您有帮助，请考虑给个 Star ⭐

---

<div align="center">

**Made with ❤️ for Cloudflare Developers**

[报告问题](https://github.com/binbankm/CF-Manager/issues) • [功能建议](https://github.com/binbankm/CF-Manager/issues)

</div>
