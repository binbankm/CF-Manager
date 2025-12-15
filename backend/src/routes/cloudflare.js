const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const CloudflareAccount = require('../models/CloudflareAccount');
const CloudflareService = require('../services/cloudflareService');

/**
 * GET /api/cloudflare/accounts
 * 获取当前用户的所有Cloudflare账号
 */
router.get('/accounts', authMiddleware, async (req, res) => {
    try {
        const accounts = await CloudflareAccount.findAll({
            where: { user_id: req.user.id },
            attributes: ['id', 'account_name', 'account_id', 'created_at']
        });

        res.json({
            success: true,
            data: { accounts }
        });
    } catch (error) {
        console.error('获取账号列表错误:', error);
        res.status(500).json({
            success: false,
            message: '获取账号列表失败'
        });
    }
});

/**
 * POST /api/cloudflare/accounts
 * 添加新的Cloudflare账号
 */
router.post('/accounts', [
    authMiddleware,
    body('accountName').notEmpty().trim(),
    body('apiToken').notEmpty()
], async (req, res) => {
    try {
        // 验证输入
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: '输入验证失败',
                errors: errors.array()
            });
        }

        const { accountName, apiToken } = req.body;

        // 验证API Token是否有效
        try {
            const cfService = new CloudflareService(apiToken);
            const accountsData = await cfService.getAccounts();

            if (!accountsData.success || !accountsData.result || accountsData.result.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'API Token无效或没有关联的账号'
                });
            }

            // 获取第一个账号ID
            const accountId = accountsData.result[0].id;

            // 创建账号记录
            const account = await CloudflareAccount.create({
                user_id: req.user.id,
                account_name: accountName,
                api_token_encrypted: '', // 临时值
                account_id: accountId
            });

            // 使用模型方法加密并保存token
            account.setApiToken(apiToken);
            await account.save();

            res.status(201).json({
                success: true,
                message: '账号添加成功',
                data: {
                    account: {
                        id: account.id,
                        account_name: account.account_name,
                        account_id: account.account_id
                    }
                }
            });
        } catch (apiError) {
            console.error('Cloudflare API错误:', apiError);
            return res.status(400).json({
                success: false,
                message: 'API Token无效或权限不足'
            });
        }
    } catch (error) {
        console.error('添加账号错误:', error);
        res.status(500).json({
            success: false,
            message: '添加账号失败'
        });
    }
});

/**
 * DELETE /api/cloudflare/accounts/:id
 * 删除Cloudflare账号
 */
router.delete('/accounts/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const account = await CloudflareAccount.findOne({
            where: {
                id,
                user_id: req.user.id
            }
        });

        if (!account) {
            return res.status(404).json({
                success: false,
                message: '账号不存在'
            });
        }

        await account.destroy();

        res.json({
            success: true,
            message: '账号删除成功'
        });
    } catch (error) {
        console.error('删除账号错误:', error);
        res.status(500).json({
            success: false,
            message: '删除账号失败'
        });
    }
});

module.exports = router;
