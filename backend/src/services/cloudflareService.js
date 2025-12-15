const axios = require('axios');
const FormData = require('form-data');

/**
 * Cloudflare API服务类
 * 封装所有Cloudflare API调用
 */
class CloudflareService {
    constructor(apiToken) {
        this.apiToken = apiToken;
        this.baseURL = 'https://api.cloudflare.com/client/v4';
        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * 获取账号信息
     */
    async getAccounts() {
        const response = await this.client.get('/accounts');
        return response.data;
    }

    /**
     * 获取Workers列表（支持分页）
     */
    async getWorkers(accountId) {
        let allWorkers = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
            const response = await this.client.get(`/accounts/${accountId}/workers/scripts`, {
                params: {
                    page: page,
                    per_page: 50
                }
            });

            if (response.data.result && response.data.result.length > 0) {
                allWorkers = allWorkers.concat(response.data.result);

                const resultInfo = response.data.result_info;
                if (resultInfo && resultInfo.total_pages && page < resultInfo.total_pages) {
                    page++;
                } else {
                    hasMore = false;
                }
            } else {
                hasMore = false;
            }
        }

        return {
            success: true,
            result: allWorkers,
            errors: [],
            messages: []
        };
    }

    /**
     * 获取Worker脚本内容
     */
    async getWorkerScript(accountId, scriptName) {
        const response = await this.client.get(`/accounts/${accountId}/workers/scripts/${scriptName}`);
        return response.data;
    }

    /**
     * 上传/更新Worker脚本
     */
    async uploadWorkerScript(accountId, scriptName, content) {
        const response = await this.client.put(
            `/accounts/${accountId}/workers/scripts/${scriptName}`,
            content,
            {
                headers: {
                    'Content-Type': 'application/javascript'
                }
            }
        );
        return response.data;
    }

    async deleteWorkerScript(accountId, scriptName) {
        const response = await this.client.delete(`/accounts/${accountId}/workers/scripts/${scriptName}`);
        return response.data;
    }

    /**
     * 获取Worker设置 (包含环境变量)
     */
    async getWorkerSettings(accountId, scriptName) {
        const response = await this.client.get(`/accounts/${accountId}/workers/scripts/${scriptName}/settings`);
        return response.data;
    }

    /**
     * 更新Worker设置 (环境变量等)
     */
    async updateWorkerSettings(accountId, scriptName, settings) {
        const response = await this.client.patch(
            `/accounts/${accountId}/workers/scripts/${scriptName}/settings`,
            settings
        );
        return response.data;
    }

    /**
     * 获取Worker设置 (包含环境变量)
     */
    async getWorkerSettings(accountId, scriptName) {
        const response = await this.client.get(`/accounts/${accountId}/workers/scripts/${scriptName}/settings`);
        return response.data;
    }

    /**
     * 更新Worker设置 (环境变量等)
     */


    /**
     * 更新Worker设置 (环境变量等)
     * Cloudflare API requires uploading the script again with metadata to update bindings
     */
    async updateWorkerSettings(accountId, scriptName, settings) {
        // 1. Fetch current script content
        const currentScript = await this.getWorkerScript(accountId, scriptName);
        const scriptContent = typeof currentScript === 'string' ? currentScript : (currentScript.script || '');

        // 2. Prepare metadata
        const isServiceWorker = scriptContent.includes('addEventListener');
        const metadata = {
            bindings: settings.bindings || []
        };

        if (isServiceWorker) {
            metadata.body_part = 'index.js';
        } else {
            metadata.main_module = 'index.js';
        }

        // 3. Create Multipart FormData
        const form = new FormData();
        form.append('metadata', JSON.stringify(metadata), {
            contentType: 'application/json'
        });

        // Use appropriate Content-Type
        const scriptContentType = isServiceWorker ? 'application/javascript' : 'application/javascript+module';

        form.append('index.js', scriptContent, {
            contentType: scriptContentType
        });

        // 4. PUT to script endpoint
        const response = await this.client.put(
            `/accounts/${accountId}/workers/scripts/${scriptName}`,
            form,
            {
                headers: {
                    ...form.getHeaders()
                }
            }
        );

        return response.data;
    }

    /**
     * 获取D1数据库列表
     */
    async getD1Databases(accountId, page = 1, perPage = 20) {
        const response = await this.client.get(`/accounts/${accountId}/d1/database`, {
            params: {
                page,
                per_page: perPage
            }
        });
        return response.data;
    }

    /**
     * 获取KV命名空间列表（支持分页）
     */
    async getKVNamespaces(accountId) {
        let allNamespaces = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
            const response = await this.client.get(`/accounts/${accountId}/storage/kv/namespaces`, {
                params: { page: page, per_page: 50 }
            });

            if (response.data.result && response.data.result.length > 0) {
                allNamespaces = allNamespaces.concat(response.data.result);
                const resultInfo = response.data.result_info;
                if (resultInfo && resultInfo.total_pages && page < resultInfo.total_pages) {
                    page++;
                } else {
                    hasMore = false;
                }
            } else {
                hasMore = false;
            }
        }

        return { success: true, result: allNamespaces, errors: [], messages: [] };
    }

    /**
     * 创建KV命名空间
     */
    async createKVNamespace(accountId, title) {
        const response = await this.client.post(`/accounts/${accountId}/storage/kv/namespaces`, { title });
        return response.data;
    }

    /**
     * 删除KV命名空间
     */
    async deleteKVNamespace(accountId, namespaceId) {
        const response = await this.client.delete(`/accounts/${accountId}/storage/kv/namespaces/${namespaceId}`);
        return response.data;
    }

    /**
     * 列出KV键（支持分页）
     */
    async listKVKeys(accountId, namespaceId, prefix = '') {
        let allKeys = [];
        let cursor = null;
        let hasMore = true;

        while (hasMore) {
            const params = prefix ? { prefix } : {};
            if (cursor) params.cursor = cursor;

            const response = await this.client.get(
                `/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/keys`,
                { params }
            );

            if (response.data.result && response.data.result.length > 0) {
                allKeys = allKeys.concat(response.data.result);
                cursor = response.data.result_info?.cursor;
                hasMore = !!cursor;
            } else {
                hasMore = false;
            }
        }

        return { success: true, result: allKeys, errors: [], messages: [] };
    }

    /**
     * 读取KV值
     */
    async readKVValue(accountId, namespaceId, key) {
        const response = await this.client.get(
            `/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${key}`,
            {
                // 不解析响应，获取原始文本
                transformResponse: [(data) => data]
            }
        );
        // 返回原始数据
        return response.data;
    }

    /**
     * 写入KV值
     */
    async writeKVValue(accountId, namespaceId, key, value, metadata = null) {
        const formData = new FormData();
        formData.append('value', value);
        if (metadata) {
            formData.append('metadata', JSON.stringify(metadata));
        }

        const response = await this.client.put(
            `/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${key}`,
            formData
        );
        return response.data;
    }

    /**
     * 删除KV键
     */
    async deleteKVKey(accountId, namespaceId, key) {
        const response = await this.client.delete(
            `/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${key}`
        );
        return response.data;
    }

    /**
     * 获取DNS区域列表（支持分页）
     */
    async getZones() {
        let allZones = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
            const response = await this.client.get('/zones', {
                params: {
                    page: page,
                    per_page: 50
                }
            });

            if (response.data.result && response.data.result.length > 0) {
                allZones = allZones.concat(response.data.result);

                // 检查是否还有更多页
                const resultInfo = response.data.result_info;
                if (resultInfo && resultInfo.total_pages && page < resultInfo.total_pages) {
                    page++;
                } else {
                    hasMore = false;
                }
            } else {
                hasMore = false;
            }
        }

        return {
            success: true,
            result: allZones,
            errors: [],
            messages: []
        };
    }

    /**
     * 获取DNS记录（支持分页）
     */
    async getDNSRecords(zoneId) {
        let allRecords = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
            const response = await this.client.get(`/zones/${zoneId}/dns_records`, {
                params: { page: page, per_page: 100 }
            });

            if (response.data.result && response.data.result.length > 0) {
                allRecords = allRecords.concat(response.data.result);
                const resultInfo = response.data.result_info;
                if (resultInfo && resultInfo.total_pages && page < resultInfo.total_pages) {
                    page++;
                } else {
                    hasMore = false;
                }
            } else {
                hasMore = false;
            }
        }

        return { success: true, result: allRecords, errors: [], messages: [] };
    }

    /**
     * 创建DNS记录
     */
    async createDNSRecord(zoneId, record) {
        const response = await this.client.post(`/zones/${zoneId}/dns_records`, record);
        return response.data;
    }

    /**
     * 更新DNS记录
     */
    async updateDNSRecord(zoneId, recordId, record) {
        const response = await this.client.put(`/zones/${zoneId}/dns_records/${recordId}`, record);
        return response.data;
    }

    /**
     * 删除DNS记录
     */
    async deleteDNSRecord(zoneId, recordId) {
        const response = await this.client.delete(`/zones/${zoneId}/dns_records/${recordId}`);
        return response.data;
    }

    /**
     * 获取Pages项目列表
     */
    async getPagesProjects(accountId) {
        const response = await this.client.get(`/accounts/${accountId}/pages/projects`);
        return response.data;
    }

    /**
     * 获取Pages部署列表
     */
    async getPagesDeployments(accountId, projectName) {
        const response = await this.client.get(`/accounts/${accountId}/pages/projects/${projectName}/deployments`);
        return response.data;
    }

    /**
     * 创建Pages部署
     */
    async createPagesDeployment(accountId, projectName, deployment) {
        const response = await this.client.post(
            `/accounts/${accountId}/pages/projects/${projectName}/deployments`,
            deployment
        );
        return response.data;
    }


}

module.exports = CloudflareService;
