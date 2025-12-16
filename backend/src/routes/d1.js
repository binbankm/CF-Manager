const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const CloudflareAccount = require('../models/CloudflareAccount');
const CloudflareService = require('../services/cloudflareService');

/**
 * 获取账号的Cloudflare服务实例
 */
async function getCloudflareService(userId, accountId) {
    const account = await CloudflareAccount.findOne({
        where: {
            id: accountId,
            user_id: userId
        }
    });

    if (!account) {
        throw new Error('账号不存在');
    }

    const apiToken = account.getApiToken();
    return new CloudflareService(apiToken);
}

// 获取D1数据库列表
router.get('/:accountId/databases', authMiddleware, async (req, res) => {
    try {
        const cfService = await getCloudflareService(req.user.id, req.params.accountId);
        const account = await CloudflareAccount.findByPk(req.params.accountId);

        if (!account) {
            return res.status(404).json({
                success: false,
                message: '账户不存在'
            });
        }

        const page = parseInt(req.query.page) || 1;
        const perPage = parseInt(req.query.per_page) || 20;

        const result = await cfService.getD1Databases(account.account_id, page, perPage);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('获取D1数据库失败:', error);
        res.status(500).json({
            success: false,
            message: error.message || '获取D1数据库失败'
        });
    }
});

module.exports = router;
