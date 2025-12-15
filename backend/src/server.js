require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./config/database');
const fileUpload = require('express-fileupload');
const d1Routes = require('./routes/d1');

const app = express();
const PORT = process.env.PORT || 5143;

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(fileUpload());
app.use(express.text({ limit: '10mb', type: 'application/javascript' }));
app.use(express.urlencoded({ extended: true }));

// API路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/cloudflare', require('./routes/cloudflare'));
app.use('/api/workers', require('./routes/workers'));
app.use('/api/kv', require('./routes/kv'));
app.use('/api/d1', d1Routes);
app.use('/api/dns', require('./routes/dns'));
app.use('/api/pages', require('./routes/pages'));

// 健康检查端点
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Cloudflare Manager API运行中',
        timestamp: new Date().toISOString()
    });
});

// 在生产环境中提供前端静态文件
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../public')));

    // 所有其他请求返回index.html（支持前端路由）
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../public/index.html'));
    });
}

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    res.status(500).json({
        success: false,
        message: '服务器内部错误'
    });
});

// 启动服务器
async function startServer() {
    try {
        // 初始化数据库
        await initDatabase();

        // 启动HTTP服务器
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`
╔═══════════════════════════════════════════════════╗
║                                                   ║
║   🚀 Cloudflare Manager 启动成功                  ║
║                                                   ║
║   📡 服务器地址: http://localhost:${PORT}          ║
║   🌍 外网访问: http://0.0.0.0:${PORT}              ║
║   📊 环境模式: ${process.env.NODE_ENV || 'development'}                    ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
      `);
        });
    } catch (error) {
        console.error('❌ 服务器启动失败:', error);
        process.exit(1);
    }
}

startServer();
