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

/**
 * GET /api/pages/:accountId/projects
 * 获取Pages项目列表
 */
router.get('/:accountId/projects', authMiddleware, async (req, res) => {
    try {
        const cfService = await getCloudflareService(req.user.id, req.params.accountId);
        const account = await CloudflareAccount.findByPk(req.params.accountId);

        const projects = await cfService.getPagesProjects(account.account_id);

        res.json({
            success: true,
            data: projects
        });
    } catch (error) {
        console.error('获取Pages项目列表错误:', error);
        res.status(500).json({
            success: false,
            message: error.message || '获取Pages项目列表失败'
        });
    }
});

/**
 * GET /api/pages/:accountId/projects/:projectName/deployments
 * 获取Pages部署历史
 */
router.get('/:accountId/projects/:projectName/deployments', authMiddleware, async (req, res) => {
    try {
        const cfService = await getCloudflareService(req.user.id, req.params.accountId);
        const account = await CloudflareAccount.findByPk(req.params.accountId);

        const deployments = await cfService.getPagesDeployments(account.account_id, req.params.projectName);

        res.json({
            success: true,
            data: deployments
        });
    } catch (error) {
        console.error('获取Pages部署历史错误:', error);
        res.status(500).json({
            success: false,
            message: error.message || '获取Pages部署历史失败'
        });
    }
});

/**
 * POST /api/pages/:accountId/projects/:projectName/deployments
 * 触发新部署
 */
router.post('/:accountId/projects/:projectName/deployments', authMiddleware, async (req, res) => {
    try {
        const cfService = await getCloudflareService(req.user.id, req.params.accountId);
        const account = await CloudflareAccount.findByPk(req.params.accountId);

        const result = await cfService.createPagesDeployment(
            account.account_id,
            req.params.projectName,
            req.body
        );

        res.status(201).json({
            success: true,
            message: '部署触发成功',
            data: result
        });
    } catch (error) {
        console.error('触发部署错误:', error);
        res.status(500).json({
            success: false,
            message: error.message || '触发部署失败'
        });
    }
});

module.exports = router;
