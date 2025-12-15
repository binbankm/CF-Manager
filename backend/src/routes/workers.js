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
 * GET /api/workers/:accountId
 * 获取Workers列表
 */
router.get('/:accountId', authMiddleware, async (req, res) => {
    try {
        const cfService = await getCloudflareService(req.user.id, req.params.accountId);
        const account = await CloudflareAccount.findByPk(req.params.accountId);

        const workers = await cfService.getWorkers(account.account_id);

        res.json({
            success: true,
            data: workers
        });
    } catch (error) {
        console.error('获取Workers列表错误:', error);
        res.status(500).json({
            success: false,
            message: error.message || '获取Workers列表失败'
        });
    }
});

/**
 * GET /api/workers/:accountId/:scriptName
 * 获取Worker脚本内容
 */
router.get('/:accountId/:scriptName', authMiddleware, async (req, res) => {
    try {
        const cfService = await getCloudflareService(req.user.id, req.params.accountId);
        const account = await CloudflareAccount.findByPk(req.params.accountId);

        const script = await cfService.getWorkerScript(account.account_id, req.params.scriptName);

        res.json({
            success: true,
            data: script
        });
    } catch (error) {
        console.error('获取Worker脚本错误:', error);
        res.status(500).json({
            success: false,
            message: error.message || '获取Worker脚本失败'
        });
    }
});

/**
 * PUT /api/workers/:accountId/:scriptName
 * 更新Worker脚本
 */
router.put('/:accountId/:scriptName', authMiddleware, async (req, res) => {
    try {
        const cfService = await getCloudflareService(req.user.id, req.params.accountId);
        const account = await CloudflareAccount.findByPk(req.params.accountId);

        const result = await cfService.uploadWorkerScript(
            account.account_id,
            req.params.scriptName,
            req.body.content || req.body
        );

        res.json({
            success: true,
            message: 'Worker脚本更新成功',
            data: result
        });
    } catch (error) {
        console.error('更新Worker脚本错误:', error);
        res.status(500).json({
            success: false,
            message: error.message || '更新Worker脚本失败'
        });
    }
});

/**
 * POST /api/workers/:accountId
 * 创建新Worker
 */
router.post('/:accountId', authMiddleware, async (req, res) => {
    try {
        const { scriptName, content } = req.body;

        if (!scriptName || !content) {
            return res.status(400).json({
                success: false,
                message: '请提供脚本名称和内容'
            });
        }

        const cfService = await getCloudflareService(req.user.id, req.params.accountId);
        const account = await CloudflareAccount.findByPk(req.params.accountId);

        const result = await cfService.uploadWorkerScript(account.account_id, scriptName, content);

        res.status(201).json({
            success: true,
            message: 'Worker创建成功',
            data: result
        });
    } catch (error) {
        console.error('创建Worker错误:', error);
        res.status(500).json({
            success: false,
            message: error.message || '创建Worker失败'
        });
    }
});

/**
 * DELETE /api/workers/:accountId/:scriptName
 * 删除Worker
 */
router.delete('/:accountId/:scriptName', authMiddleware, async (req, res) => {
    try {
        const cfService = await getCloudflareService(req.user.id, req.params.accountId);
        const account = await CloudflareAccount.findByPk(req.params.accountId);

        await cfService.deleteWorkerScript(account.account_id, req.params.scriptName);

        res.json({
            success: true,
            message: 'Worker删除成功'
        });
    } catch (error) {
        console.error('删除Worker错误:', error);
        res.status(500).json({
            success: false,
            message: error.message || '删除Worker失败'
        });
    }
});




// 获取Worker设置
router.get('/:accountId/:scriptName/settings', authMiddleware, async (req, res) => {
    try {
        const cfService = await getCloudflareService(req.user.id, req.params.accountId);
        const account = await CloudflareAccount.findByPk(req.params.accountId);

        const result = await cfService.getWorkerSettings(account.account_id, req.params.scriptName);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('获取Worker设置错误:', error);
        res.status(500).json({
            success: false,
            message: error.message || '获取Worker设置失败'
        });
    }
});

// 更新Worker设置
router.patch('/:accountId/:scriptName/settings', authMiddleware, async (req, res) => {
    try {
        const cfService = await getCloudflareService(req.user.id, req.params.accountId);
        const account = await CloudflareAccount.findByPk(req.params.accountId);

        const result = await cfService.updateWorkerSettings(
            account.account_id,
            req.params.scriptName,
            req.body
        );

        res.json({
            success: true,
            message: 'Worker设置更新成功',
            data: result
        });
    } catch (error) {
        console.error('更新Worker设置错误:', error);
        if (error.response && error.response.data) {
            console.error('Cloudflare Error Details:', JSON.stringify(error.response.data, null, 2));
        }
        res.status(500).json({
            success: false,
            message: error.message || '更新Worker设置失败',
            details: error.response?.data
        });
    }
});

module.exports = router;
