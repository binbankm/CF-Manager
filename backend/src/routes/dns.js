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
 * GET /api/dns/:accountId/zones
 * 获取DNS区域列表
 */
router.get('/:accountId/zones', authMiddleware, async (req, res) => {
    try {
        const cfService = await getCloudflareService(req.user.id, req.params.accountId);

        const zones = await cfService.getZones();

        res.json({
            success: true,
            data: zones
        });
    } catch (error) {
        console.error('获取DNS区域列表错误:', error);
        res.status(500).json({
            success: false,
            message: error.message || '获取DNS区域列表失败'
        });
    }
});

/**
 * GET /api/dns/:accountId/zones/:zoneId/records
 * 获取DNS记录
 */
router.get('/:accountId/zones/:zoneId/records', authMiddleware, async (req, res) => {
    try {
        const cfService = await getCloudflareService(req.user.id, req.params.accountId);

        const records = await cfService.getDNSRecords(req.params.zoneId);

        res.json({
            success: true,
            data: records
        });
    } catch (error) {
        console.error('获取DNS记录错误:', error);
        res.status(500).json({
            success: false,
            message: error.message || '获取DNS记录失败'
        });
    }
});

/**
 * POST /api/dns/:accountId/zones/:zoneId/records
 * 创建DNS记录
 */
router.post('/:accountId/zones/:zoneId/records', authMiddleware, async (req, res) => {
    try {
        const { type, name, content, ttl, proxied } = req.body;

        if (!type || !name || !content) {
            return res.status(400).json({
                success: false,
                message: '请提供记录类型、名称和内容'
            });
        }

        const cfService = await getCloudflareService(req.user.id, req.params.accountId);

        const record = {
            type,
            name,
            content,
            ttl: ttl || 1, // 1 = auto
            proxied: proxied !== undefined ? proxied : false
        };

        const result = await cfService.createDNSRecord(req.params.zoneId, record);

        res.status(201).json({
            success: true,
            message: 'DNS记录创建成功',
            data: result
        });
    } catch (error) {
        console.error('创建DNS记录错误:', error);
        res.status(500).json({
            success: false,
            message: error.message || '创建DNS记录失败'
        });
    }
});

/**
 * PUT /api/dns/:accountId/zones/:zoneId/records/:recordId
 * 更新DNS记录
 */
router.put('/:accountId/zones/:zoneId/records/:recordId', authMiddleware, async (req, res) => {
    try {
        const { type, name, content, ttl, proxied } = req.body;

        if (!type || !name || !content) {
            return res.status(400).json({
                success: false,
                message: '请提供记录类型、名称和内容'
            });
        }

        const cfService = await getCloudflareService(req.user.id, req.params.accountId);

        const record = {
            type,
            name,
            content,
            ttl: ttl || 1,
            proxied: proxied !== undefined ? proxied : false
        };

        const result = await cfService.updateDNSRecord(req.params.zoneId, req.params.recordId, record);

        res.json({
            success: true,
            message: 'DNS记录更新成功',
            data: result
        });
    } catch (error) {
        console.error('更新DNS记录错误:', error);
        res.status(500).json({
            success: false,
            message: error.message || '更新DNS记录失败'
        });
    }
});

/**
 * DELETE /api/dns/:accountId/zones/:zoneId/records/:recordId
 * 删除DNS记录
 */
router.delete('/:accountId/zones/:zoneId/records/:recordId', authMiddleware, async (req, res) => {
    try {
        const cfService = await getCloudflareService(req.user.id, req.params.accountId);

        await cfService.deleteDNSRecord(req.params.zoneId, req.params.recordId);

        res.json({
            success: true,
            message: 'DNS记录删除成功'
        });
    } catch (error) {
        console.error('删除DNS记录错误:', error);
        res.status(500).json({
            success: false,
            message: error.message || '删除DNS记录失败'
        });
    }
});

/**
 * GET /api/dns/:accountId/zones/:zoneId/export
 * 导出DNS记录 (BIND格式)
 */
router.get('/:accountId/zones/:zoneId/export', authMiddleware, async (req, res) => {
    try {
        const cfService = await getCloudflareService(req.user.id, req.params.accountId);
        const account = await CloudflareAccount.findByPk(req.params.accountId);
        const format = req.query.format || 'bind';

        // 获取该区域的所有DNS记录
        const recordsResponse = await cfService.getDNSRecords(req.params.zoneId);
        const records = recordsResponse.result || [];

        if (format === 'json') {
            return res.json({ success: true, data: records });
        }

        // BIND格式导出
        let bindContent = `; DNS Zone export for ${req.params.zoneId}\n`;
        bindContent += `; Exported at ${new Date().toISOString()}\n\n`;
        bindContent += `$ORIGIN .\n`;
        bindContent += `$TTL 3600\n\n`;

        records.forEach(record => {
            const name = record.name;
            const type = record.type;
            const ttl = record.ttl === 1 ? 3600 : record.ttl; // 1 = auto
            const content = record.content;
            const priority = record.priority ? ` ${record.priority}` : '';

            // 简单的BIND格式化
            bindContent += `${name}.\t${ttl}\tIN\t${type}${priority}\t${content}\n`;
        });

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="dns-export-${req.params.zoneId}.txt"`);
        res.send(bindContent);

    } catch (error) {
        console.error('导出DNS失败:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/dns/:accountId/zones/:zoneId/import
 * 导入DNS记录 (支持 BIND 格式)
 */
router.post('/:accountId/zones/:zoneId/import', authMiddleware, async (req, res) => {
    try {
        if (!req.files || !req.files.file) {
            return res.status(400).json({ success: false, message: '请上传文件' });
        }

        const file = req.files.file;
        const fileContent = file.data.toString('utf8');
        const { accountId, zoneId } = req.params;

        const cfService = await getCloudflareService(req.user.id, accountId);
        const account = await CloudflareAccount.findByPk(accountId);

        // 简易 BIND 解析器
        const lines = fileContent.split('\n');
        const records = [];
        let origin = '@';
        let defaultTTL = 1; // Auto

        for (let line of lines) {
            line = line.trim();
            if (!line || line.startsWith(';')) continue;

            // 处理 $ORIGIN 和 $TTL
            if (line.toUpperCase().startsWith('$ORIGIN')) {
                const parts = line.split(/\s+/);
                if (parts.length >= 2) origin = parts[1];
                continue;
            }
            if (line.toUpperCase().startsWith('$TTL')) {
                const parts = line.split(/\s+/);
                if (parts.length >= 2) defaultTTL = parseInt(parts[1], 10);
                continue;
            }

            // 解析记录行: name ttl class type content
            // 简化假设: 标准 BIND 格式通常是: example.com. 3600 IN A 1.2.3.4
            // 或者: @ 3600 IN A 1.2.3.4
            // 或者: www IN A 1.2.3.4 (使用之前的 TTL)

            // 这是一个非常简化的解析，仅支持基本格式
            // 真实世界的 BIND 解析非常复杂，这里只处理最常见的情况
            try {
                // 移除注释部分
                const cleanLine = line.split(';')[0].trim();
                const parts = cleanLine.split(/\s+/);

                if (parts.length < 3) continue;

                let name = parts[0];
                let ttl = defaultTTL;
                let type = '';
                let content = '';
                let index = 1;

                // 检查 TTL
                if (/^\d+$/.test(parts[index])) {
                    ttl = parseInt(parts[index], 10);
                    index++;
                }

                // 跳过 IN 类
                if (parts[index] && parts[index].toUpperCase() === 'IN') {
                    index++;
                }

                type = parts[index] ? parts[index].toUpperCase() : '';
                index++;

                // 剩余部分为 content
                content = parts.slice(index).join(' ');

                // 验证关键字段
                if (!type || !content) continue;

                // 忽略 SOA 和 NS 可能通常不由用户手动导入
                if (['SOA', 'NS'].includes(type) && name === '@') continue;

                // 转换为 Cloudflare 格式
                const record = {
                    type,
                    name: name === '@' ? account.zone_name || '@' : name, // 这里可能需要更智能的处理
                    content: content.replace(/"/g, ''), // 移除 TXT 记录的引号
                    ttl,
                    proxied: false // 默认不代理，用户可后续开启
                };

                records.push(record);
            } catch (e) {
                console.warn('Skipping line:', line, e);
            }
        }

        // 批量创建
        let successCount = 0;
        let failCount = 0;
        const results = [];

        for (const rec of records) {
            try {
                await cfService.createDNSRecord(account.account_id, zoneId, rec);
                successCount++;
                results.push({ name: rec.name, status: 'success' });
            } catch (err) {
                failCount++;
                results.push({ name: rec.name, status: 'failed', error: err.message });
                console.error(`Import API: Failed to create record ${rec.name}:`, err.message);
            }
        }

        res.json({
            success: true,
            data: {
                total: records.length,
                success: successCount,
                failed: failCount,
                details: results
            }
        });

    } catch (error) {
        console.error('导入DNS记录失败:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
