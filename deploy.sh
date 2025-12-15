#!/bin/bash
#
# Cloudflare Manager - 首次部署脚本
# 
# 此脚本会自动：
# 1. 检查 Docker 是否安装
# 2. 创建并配置 .env 文件
# 3. 生成安全的密钥
# 4. 启动应用
#

set -e

echo "========================================="
echo "  Cloudflare Manager - 部署脚本"
echo "========================================="
echo ""

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ 错误: 未检测到 Docker"
    echo "请先安装 Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    echo "❌ 错误: 未检测到 Docker Compose"
    echo "请先安装 Docker Compose"
    exit 1
fi

echo "✅ Docker 环境检查通过"
echo ""

# 检查 .env 文件
if [ -f ".env" ]; then
    echo "⚠️  检测到已存在的 .env 文件"
    read -p "是否覆盖? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "保留现有 .env 文件"
    else
        rm .env
        echo "已删除旧的 .env 文件"
    fi
fi

# 创建 .env 文件
if [ ! -f ".env" ]; then
    echo "📝 创建 .env 文件..."
    
    # 生成安全密钥
    JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')
    ENCRYPTION_KEY=$(openssl rand -hex 16)
    
    cat > .env << EOF
# Cloudflare Manager - 环境变量配置
# 自动生成于: $(date)

# 应用配置
NODE_ENV=production
PORT=5143

# 安全密钥（已自动生成）
JWT_SECRET=$JWT_SECRET
ENCRYPTION_KEY=$ENCRYPTION_KEY

# 数据库配置
DATABASE_PATH=/app/data/database.sqlite

# 日志配置
LOG_LEVEL=info
EOF
    
    echo "✅ .env 文件已创建，密钥已自动生成"
else
    echo "✅ 使用现有 .env 文件"
fi

echo ""

# 创建数据目录
mkdir -p data
echo "✅ 数据目录已创建"
echo ""

# 构建并启动
echo "🚀 开始构建并启动应用..."
echo ""
docker compose up -d --build

echo ""
echo "========================================="
echo "  🎉 部署完成！"
echo "========================================="
echo ""
echo "访问地址: http://localhost:5143"
echo "健康检查: http://localhost:5143/api/health"
echo ""
echo "查看日志: docker compose logs -f"
echo "停止应用: docker compose down"
echo ""
echo "⚠️  生产环境建议："
echo "   1. 配置 Nginx 反向代理"
echo "   2. 启用 HTTPS (Let's Encrypt)"
echo "   3. 配置防火墙"
echo "   4. 设置自动备份"
echo ""
