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
 * GET /api/kv/:accountId/namespaces
 * 获取KV命名空间列表
 */
router.get('/:accountId/namespaces', authMiddleware, async (req, res) => {
    try {
        const cfService = await getCloudflareService(req.user.id, req.params.accountId);
        const account = await CloudflareAccount.findByPk(req.params.accountId);

        const namespaces = await cfService.getKVNamespaces(account.account_id);

        res.json({
            success: true,
            data: namespaces
        });
    } catch (error) {
        console.error('获取KV命名空间列表错误:', error);
        res.status(500).json({
            success: false,
            message: error.message || '获取KV命名空间列表失败'
        });
    }
});

/**
 * POST /api/kv/:accountId/namespaces
 * 创建KV命名空间
 */
router.post('/:accountId/namespaces', authMiddleware, async (req, res) => {
    try {
        const { title } = req.body;

        if (!title) {
            return res.status(400).json({
                success: false,
                message: '请提供命名空间名称'
            });
        }

        const cfService = await getCloudflareService(req.user.id, req.params.accountId);
        const account = await CloudflareAccount.findByPk(req.params.accountId);

        const result = await cfService.createKVNamespace(account.account_id, title);

        res.status(201).json({
            success: true,
            message: 'KV命名空间创建成功',
            data: result
        });
    } catch (error) {
        console.error('创建KV命名空间错误:', error);
        res.status(500).json({
            success: false,
            message: error.message || '创建KV命名空间失败'
        });
    }
});

/**
 * DELETE /api/kv/:accountId/namespaces/:namespaceId
 * 删除KV命名空间
 */
router.delete('/:accountId/namespaces/:namespaceId', authMiddleware, async (req, res) => {
    try {
        const cfService = await getCloudflareService(req.user.id, req.params.accountId);
        const account = await CloudflareAccount.findByPk(req.params.accountId);

        await cfService.deleteKVNamespace(account.account_id, req.params.namespaceId);

        res.json({
            success: true,
            message: 'KV命名空间删除成功'
        });
    } catch (error) {
        console.error('删除KV命名空间错误:', error);
        res.status(500).json({
            success: false,
            message: error.message || '删除KV命名空间失败'
        });
    }
});

/**
 * GET /api/kv/:accountId/namespaces/:namespaceId/keys
 * 获取KV键列表
 */
router.get('/:accountId/namespaces/:namespaceId/keys', authMiddleware, async (req, res) => {
    try {
        const cfService = await getCloudflareService(req.user.id, req.params.accountId);
        const account = await CloudflareAccount.findByPk(req.params.accountId);

        const prefix = req.query.prefix || '';
        const keys = await cfService.listKVKeys(account.account_id, req.params.namespaceId, prefix);

        res.json({
            success: true,
            data: keys
        });
    } catch (error) {
        console.error('获取KV键列表错误:', error);
        res.status(500).json({
            success: false,
            message: error.message || '获取KV键列表失败'
        });
    }
});

/**
 * GET /api/kv/:accountId/namespaces/:namespaceId/keys/:key
 * 获取KV值
 */
router.get('/:accountId/namespaces/:namespaceId/keys/:key', authMiddleware, async (req, res) => {
    try {
        const cfService = await getCloudflareService(req.user.id, req.params.accountId);
        const account = await CloudflareAccount.findByPk(req.params.accountId);

        const value = await cfService.readKVValue(
            account.account_id,
            req.params.namespaceId,
            req.params.key
        );

        // 尝试解析JSON，如果失败则返回原始字符串
        let parsedValue = value;
        if (typeof value === 'string') {
            try {
                parsedValue = JSON.parse(value);
            } catch (e) {
                // 不是JSON，保持原样
            }
        }

        res.json({
            success: true,
            data: parsedValue
        });
    } catch (error) {
        console.error('读取KV值错误:', error);
        res.status(500).json({
            success: false,
            message: error.message || '读取KV值失败'
        });
    }
});

/**
 * PUT /api/kv/:accountId/namespaces/:namespaceId/keys/:key
 * 设置KV值
 */
router.put('/:accountId/namespaces/:namespaceId/keys/:key', authMiddleware, async (req, res) => {
    try {
        const { value, metadata } = req.body;

        const cfService = await getCloudflareService(req.user.id, req.params.accountId);
        const account = await CloudflareAccount.findByPk(req.params.accountId);

        await cfService.writeKVValue(account.account_id, req.params.namespaceId, req.params.key, value, metadata);

        res.json({
            success: true,
            message: 'KV值设置成功'
        });
    } catch (error) {
        console.error('设置KV值错误:', error);
        res.status(500).json({
            success: false,
            message: error.message || '设置KV值失败'
        });
    }
});

/**
 * DELETE /api/kv/:accountId/namespaces/:namespaceId/keys/:key
 * 删除KV键
 */
router.delete('/:accountId/namespaces/:namespaceId/keys/:key', authMiddleware, async (req, res) => {
    try {
        const cfService = await getCloudflareService(req.user.id, req.params.accountId);
        const account = await CloudflareAccount.findByPk(req.params.accountId);

        await cfService.deleteKVKey(account.account_id, req.params.namespaceId, req.params.key);

        res.json({
            success: true,
            message: 'KV键删除成功'
        });
    } catch (error) {
        console.error('删除KV键错误:', error);
        res.status(500).json({
            success: false,
            message: error.message || '删除KV键失败'
        });
    }
});

/**
 * POST /api/kv/:accountId/namespaces/:namespaceId/bulk-import
 * 批量导入KV键值对
 */
router.post('/:accountId/namespaces/:namespaceId/bulk-import', authMiddleware, async (req, res) => {
    try {
        const { data } = req.body; // data should be array of { key, value, metadata }

        if (!Array.isArray(data) || data.length === 0) {
            return res.status(400).json({
                success: false,
                message: '请提供有效的数据数组'
            });
        }

        const cfService = await getCloudflareService(req.user.id, req.params.accountId);
        const account = await CloudflareAccount.findByPk(req.params.accountId);

        const results = {
            success: 0,
            failed: 0,
            errors: []
        };

        // 批量写入
        for (const item of data) {
            try {
                await cfService.writeKVValue(
                    account.account_id,
                    req.params.namespaceId,
                    item.key,
                    item.value,
                    item.metadata
                );
                results.success++;
            } catch (error) {
                results.failed++;
                results.errors.push({ key: item.key, error: error.message });
            }
        }

        res.json({
            success: true,
            message: `导入完成: ${results.success}成功, ${results.failed}失败`,
            data: results
        });
    } catch (error) {
        console.error('批量导入KV错误:', error);
        res.status(500).json({
            success: false,
            message: error.message || '批量导入失败'
        });
    }
});

/**
 * GET /api/kv/:accountId/namespaces/:namespaceId/export
 * 导出命名空间所有键值对
 */
router.get('/:accountId/namespaces/:namespaceId/export', authMiddleware, async (req, res) => {
    try {
        const cfService = await getCloudflareService(req.user.id, req.params.accountId);
        const account = await CloudflareAccount.findByPk(req.params.accountId);

        // 获取所有键
        const keysResponse = await cfService.listKVKeys(account.account_id, req.params.namespaceId, '');
        const keys = keysResponse.result || [];

        const exportData = [];

        // 获取每个键的值
        for (const keyInfo of keys) {
            try {
                const value = await cfService.readKVValue(
                    account.account_id,
                    req.params.namespaceId,
                    keyInfo.name
                );
                exportData.push({
                    key: keyInfo.name,
                    value: value,
                    metadata: keyInfo.metadata || {}
                });
            } catch (error) {
                console.error(`读取键 ${keyInfo.name} 失败:`, error);
            }
        }

        res.json({
            success: true,
            data: exportData
        });
    } catch (error) {
        console.error('导出KV数据错误:', error);
        res.status(500).json({
            success: false,
            message: error.message || '导出失败'
        });
    }
});

/**
 * POST /api/kv/:accountId/namespaces/:namespaceId/bulk-delete
 * 批量删除KV键
 */
router.post('/:accountId/namespaces/:namespaceId/bulk-delete', authMiddleware, async (req, res) => {
    try {
        const { keys } = req.body; // keys should be array of key names

        if (!Array.isArray(keys) || keys.length === 0) {
            return res.status(400).json({
                success: false,
                message: '请提供要删除的键列表'
            });
        }

        const cfService = await getCloudflareService(req.user.id, req.params.accountId);
        const account = await CloudflareAccount.findByPk(req.params.accountId);

        const results = {
            success: 0,
            failed: 0,
            errors: []
        };

        // 批量删除
        for (const key of keys) {
            try {
                await cfService.deleteKVKey(
                    account.account_id,
                    req.params.namespaceId,
                    key
                );
                results.success++;
            } catch (error) {
                results.failed++;
                results.errors.push({ key, error: error.message });
            }
        }

        res.json({
            success: true,
            message: `删除完成: ${results.success}成功, ${results.failed}失败`,
            data: results
        });
    } catch (error) {
        console.error('批量删除KV错误:', error);
        res.status(500).json({
            success: false,
            message: error.message || '批量删除失败'
        });
    }
});

module.exports = router;
