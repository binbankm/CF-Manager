#!/bin/bash
#
# =======================================================================
# Cloudflare Manager - 一键部署脚本
# =======================================================================
#
# 功能：
#   ✓ 环境检查（Docker、Docker Compose、openssl）
#   ✓ 自动配置 .env 文件并生成安全密钥
#   ✓ 创建必要的目录结构
#   ✓ 拉取最新镜像或从源码构建
#   ✓ 启动应用并进行健康检查
#
# 使用方法：
#   chmod +x deploy.sh
#   ./deploy.sh          # 使用预构建镜像（推荐）
#   ./deploy.sh --build  # 从源码构建
#
# =======================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }
print_header() { echo -e "\n${BLUE}═══${NC} $1 ${BLUE}═══${NC}\n"; }

# 检查命令是否存在
command_exists() {
    command -v "$1" &> /dev/null
}

# 显示欢迎信息
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║         Cloudflare Manager - 部署脚本 v1.1                ║"
echo "║         一站式 Cloudflare 资源管理平台                    ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# 解析参数
BUILD_FROM_SOURCE=false
if [[ "$1" == "--build" ]]; then
    BUILD_FROM_SOURCE=true
    print_info "将从源码构建镜像"
fi

# ============================================
# 1. 环境检查
# ============================================
print_header "环境检查"

# 检查 Docker
if ! command_exists docker; then
    print_error "Docker 未安装"
    echo ""
    echo "请先安装 Docker："
    echo "  macOS/Windows: https://www.docker.com/products/docker-desktop"
    echo "  Linux: https://docs.docker.com/engine/install/"
    exit 1
fi
print_success "Docker 已安装 ($(docker --version | cut -d' ' -f3 | tr -d ','))"

# 检查 Docker Compose
if ! docker compose version &> /dev/null; then
    print_error "Docker Compose 未安装或版本过旧"
    echo ""
    echo "请更新 Docker 到最新版本"
    exit 1
fi
print_success "Docker Compose 已安装 ($(docker compose version --short))"

# 检查 openssl
if ! command_exists openssl; then
    print_warning "openssl 未找到，将使用默认密钥（不安全）"
    USE_DEFAULT_SECRETS=true
else
    print_success "openssl 已安装"
    USE_DEFAULT_SECRETS=false
fi

# 检查 Docker 是否运行
if ! docker info &> /dev/null; then
    print_error "Docker 服务未运行"
    echo ""
    echo "请启动 Docker Desktop 或 Docker 服务"
    exit 1
fi
print_success "Docker 服务正在运行"

# ============================================
# 2. 下载必要文件
# ============================================
print_header "检查必要文件"

GITHUB_RAW_URL="https://raw.githubusercontent.com/binbankm/CF-Manager/main"

# 检查并下载 docker-compose.yml
if [ ! -f "docker-compose.yml" ]; then
    print_info "下载 docker-compose.yml..."
    if command_exists wget; then
        wget -q "$GITHUB_RAW_URL/docker-compose.yml" -O docker-compose.yml
    elif command_exists curl; then
        curl -sL "$GITHUB_RAW_URL/docker-compose.yml" -o docker-compose.yml
    else
        print_error "需要 wget 或 curl 来下载文件"
        exit 1
    fi
    
    if [ -f "docker-compose.yml" ]; then
        print_success "docker-compose.yml 下载成功"
    else
        print_error "docker-compose.yml 下载失败"
        exit 1
    fi
else
    print_success "docker-compose.yml 已存在"
fi

# 检查并下载 .env.example（作为参考）
if [ ! -f ".env.example" ]; then
    print_info "下载 .env.example..."
    if command_exists wget; then
        wget -q "$GITHUB_RAW_URL/.env.example" -O .env.example 2>/dev/null || true
    elif command_exists curl; then
        curl -sL "$GITHUB_RAW_URL/.env.example" -o .env.example 2>/dev/null || true
    fi
    
    if [ -f ".env.example" ]; then
        print_success ".env.example 下载成功"
    else
        print_warning ".env.example 下载失败（不影响部署）"
    fi
else
    print_success ".env.example 已存在"
fi

# ============================================
# 3. 配置 .env 文件
# ============================================
print_header "配置环境变量"

ENV_FILE=".env"
if [ -f "$ENV_FILE" ]; then
    print_warning "检测到已存在的 .env 文件"
    echo ""
    read -p "是否覆盖现有配置？(y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "保留现有 .env 文件"
    else
        cp "$ENV_FILE" "${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
        print_info "已备份旧配置为 ${ENV_FILE}.backup.*"
        rm "$ENV_FILE"
    fi
fi

# 创建 .env 文件
if [ ! -f "$ENV_FILE" ]; then
    print_info "创建新的 .env 文件..."
    
    # 生成安全密钥
    if [ "$USE_DEFAULT_SECRETS" = true ]; then
        JWT_SECRET="PLEASE_CHANGE_THIS_SECRET_KEY_IN_PRODUCTION"
        ENCRYPTION_KEY="0123456789abcdef0123456789abcdef"
        print_warning "使用默认密钥（生产环境必须修改！）"
    else
        JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')
        ENCRYPTION_KEY=$(openssl rand -hex 16)
        print_success "已生成随机安全密钥"
    fi
    
    # 写入配置文件
    cat > "$ENV_FILE" << EOF
# =============================================================================
# Cloudflare Manager - 环境变量配置
# =============================================================================
# 自动生成时间: $(date '+%Y-%m-%d %H:%M:%S')
#
# ⚠️ 重要提示:
# 1. 生产环境必须使用强随机密钥
# 2. 不要将此文件提交到版本控制系统
# 3. 定期备份此文件
# =============================================================================

# -----------------------------------------------------------------------------
# 应用基础配置
# -----------------------------------------------------------------------------
NODE_ENV=production
PORT=5143

# -----------------------------------------------------------------------------
# 安全密钥 (已自动生成)
# -----------------------------------------------------------------------------
# JWT 密钥 - 用于用户认证token签名
JWT_SECRET=$JWT_SECRET

# 数据加密密钥 - 用于加密存储的 Cloudflare API Token
ENCRYPTION_KEY=$ENCRYPTION_KEY

# -----------------------------------------------------------------------------
# 数据库配置
# -----------------------------------------------------------------------------
# Docker 环境数据库路径（不建议修改）
DATABASE_PATH=/app/data/database.sqlite

# -----------------------------------------------------------------------------
# 日志配置
# -----------------------------------------------------------------------------
# 可选值: debug, info, warn, error
LOG_LEVEL=info

# -----------------------------------------------------------------------------
# 可选配置
# -----------------------------------------------------------------------------
# 跨域配置（如需从不同域名访问时取消注释）
# CORS_ORIGIN=https://your-domain.com
EOF
    
    print_success ".env 文件创建成功"
    echo ""
    print_info "密钥信息已保存到 .env 文件"
else
    print_success "使用现有 .env 文件"
fi

# ============================================
# 4. 创建目录结构
# ============================================
print_header "初始化目录"

# 创建数据目录
mkdir -p data
print_success "数据目录: ./data"

# 创建备份目录（可选）
mkdir -p backups
print_success "备份目录: ./backups"

# ============================================
# 5. 部署应用
# ============================================
print_header "部署应用"

if [ "$BUILD_FROM_SOURCE" = true ]; then
    print_info "从源码构建镜像..."
    echo ""
    docker compose build
    echo ""
    print_success "镜像构建完成"
    print_info "启动容器..."
    echo ""
    docker compose up -d
else
    print_info "拉取预构建镜像..."
    echo ""
    docker compose pull
    echo ""
    print_success "镜像拉取完成"
    print_info "启动容器..."
    echo ""
    docker compose up -d
fi

# ============================================
# 6. 健康检查
# ============================================
print_header "健康检查"

print_info "等待服务启动..."
sleep 5

# 检查容器状态
if docker compose ps | grep -q "Up"; then
    print_success "容器启动成功"
else
    print_error "容器启动失败"
    echo ""
    echo "查看日志："
    echo "  docker compose logs"
    exit 1
fi

# 检查健康端点
print_info "检查API健康状态..."
MAX_RETRIES=30
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -f http://localhost:5143/api/health &> /dev/null; then
        print_success "API 健康检查通过"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
        echo -n "."
        sleep 2
    else
        echo ""
        print_warning "API 健康检查超时（可能仍在初始化中）"
    fi
done
echo ""

# ============================================
# 完成信息
# ============================================
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║                    🎉 部署完成！                          ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
print_success "应用访问地址: http://localhost:5143"
print_success "API健康检查: http://localhost:5143/api/health"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  常用命令"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  查看日志:     docker compose logs -f"
echo "  查看状态:     docker compose ps"
echo "  重启服务:     docker compose restart"
echo "  停止服务:     docker compose down"
echo "  更新应用:     docker compose pull && docker compose up -d"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$USE_DEFAULT_SECRETS" = true ]; then
    echo "⚠️  安全警告:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_warning "当前使用默认密钥，生产环境必须修改！"
    echo ""
    echo "  1. 停止应用: docker compose down"
    echo "  2. 编辑 .env 文件，修改 JWT_SECRET 和 ENCRYPTION_KEY"
    echo "  3. 重新启动: docker compose up -d"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
fi

echo "📖 生产环境部署建议:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  1. 配置 Nginx/Caddy 反向代理"
echo "  2. 启用 HTTPS (Let's Encrypt)"
echo "  3. 限制端口访问（修改 docker-compose.yml 端口为 127.0.0.1:5143:5143）"
echo "  4. 配置防火墙规则"
echo "  5. 设置自动备份（参考 README.md）"
echo "  6. 配置监控和日志收集"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
print_info "完整文档: https://github.com/binbankm/CF-Manager"
echo ""
