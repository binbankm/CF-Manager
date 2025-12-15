const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * JWT认证中间件
 * 验证请求头中的Token并解析用户信息
 */
async function authMiddleware(req, res, next) {
    try {
        // 从请求头获取token
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: '未提供认证令牌'
            });
        }

        const token = authHeader.substring(7); // 移除 "Bearer " 前缀

        // 验证token
        const decoded = jwt.verify(token, JWT_SECRET);

        // 将用户信息附加到请求对象
        req.user = {
            id: decoded.userId,
            username: decoded.username,
            email: decoded.email
        };

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: '无效的认证令牌'
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: '认证令牌已过期'
            });
        }

        return res.status(500).json({
            success: false,
            message: '认证失败'
        });
    }
}

module.exports = authMiddleware;
