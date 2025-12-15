import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

// 创建axios实例
const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

// 请求拦截器 - 添加JWT Token
api.interceptors.request.use(
    (config) => {
        const token = useAuthStore.getState().token;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 响应拦截器 - 处理错误
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        // 网络错误
        if (!error.response) {
            toast.error('网络连接失败，请检查您的网络');
            return Promise.reject(error);
        }

        const { status, data } = error.response;

        // 根据状态码显示不同错误
        switch (status) {
            case 400:
                toast.error(data?.message || '请求参数错误');
                break;
            case 401:
                useAuthStore.getState().logout();
                toast.error('登录已过期，请重新登录');
                window.location.href = '/login';
                break;
            case 403:
                // Cloudflare API权限错误
                if (data?.details?.errors) {
                    const cfError = data.details.errors[0];
                    toast.error(`权限不足: ${cfError?.message || '请检查API Token权限'}`);
                } else {
                    toast.error(data?.message || '权限不足，请检查API Token');
                }
                break;
            case 404:
                toast.error(data?.message || '请求的资源不存在');
                break;
            case 429:
                toast.error('请求过于频繁，请稍后再试');
                break;
            case 500:
            case 502:
            case 503:
                toast.error('服务器错误，请稍后重试');
                break;
            default:
                // 显示后端返回的错误信息或通用提示
                const message = data?.message || data?.error || `请求失败 (${status})`;
                toast.error(message);
        }

        return Promise.reject(error);
    }
);

/**
 * 认证API
 */
export const authAPI = {
    // 注册
    register: (data) => api.post('/auth/register', data),

    // 登录
    login: (data) => api.post('/auth/login', data),

    // 获取当前用户
    getMe: () => api.get('/auth/me')
};

/**
 * Cloudflare账号API
 */
export const accountAPI = {
    // 获取账号列表
    getAccounts: () => api.get('/cloudflare/accounts'),

    // 添加账号
    addAccount: (data) => api.post('/cloudflare/accounts', data),

    // 删除账号
    deleteAccount: (id) => api.delete(`/cloudflare/accounts/${id}`)
};

/**
 * Workers API
 */
export const workersAPI = {
    // 获取Workers列表
    getWorkers: (accountId) => api.get(`/workers/${accountId}`),

    // 获取Worker脚本
    getWorkerScript: (accountId, scriptName) => api.get(`/workers/${accountId}/${scriptName}`),

    // 创建Worker
    createWorker: (accountId, data) => api.post(`/workers/${accountId}`, data),

    // 获取Worker设置
    getWorkerSettings: (accountId, scriptName) => api.get(`/workers/${accountId}/${scriptName}/settings`),

    // 更新Worker设置
    updateWorkerSettings: (accountId, scriptName, settings) => api.patch(`/workers/${accountId}/${scriptName}/settings`, settings),

    // 部署Worker脚本
    deployWorker: (accountId, scriptName, scriptContent) =>
        api.put(`/workers/${accountId}/scripts/${scriptName}`, { content: scriptContent }),

    // 更新Worker
    updateWorker: (accountId, scriptName, content) =>
        api.put(`/workers/${accountId}/${scriptName}`, content, {
            headers: { 'Content-Type': 'application/javascript' }
        }),

    // 删除Worker
    deleteWorker: (accountId, scriptName) => api.delete(`/workers/${accountId}/${scriptName}`)
};

/**
 * KV API
 */
export const kvAPI = {
    // 获取KV命名空间列表
    getNamespaces: (accountId) => api.get(`/kv/${accountId}/namespaces`),

    // 创建命名空间
    createNamespace: (accountId, title) => api.post(`/kv/${accountId}/namespaces`, { title }),

    // 删除命名空间
    deleteNamespace: (accountId, namespaceId) => api.delete(`/kv/${accountId}/namespaces/${namespaceId}`),

    // 获取键列表
    getKeys: (accountId, namespaceId, prefix = '') =>
        api.get(`/kv/${accountId}/namespaces/${namespaceId}/keys`, { params: { prefix } }),

    // 获取键值
    getValue: (accountId, namespaceId, key) =>
        api.get(`/kv/${accountId}/namespaces/${namespaceId}/keys/${key}`),

    // 设置键值
    setValue: (accountId, namespaceId, key, value, metadata = {}) =>
        api.put(`/kv/${accountId}/namespaces/${namespaceId}/keys/${key}`, { value, metadata }),

    // 删除键
    deleteKey: (accountId, namespaceId, key) =>
        api.delete(`/kv/${accountId}/namespaces/${namespaceId}/keys/${key}`),

    // 批量导入
    bulkImport: (accountId, namespaceId, data) =>
        api.post(`/kv/${accountId}/namespaces/${namespaceId}/bulk-import`, { data }),

    // 导出数据
    exportData: (accountId, namespaceId) =>
        api.get(`/kv/${accountId}/namespaces/${namespaceId}/export`),

    // 批量删除
    bulkDelete: (accountId, namespaceId, keys) =>
        api.post(`/kv/${accountId}/namespaces/${namespaceId}/bulk-delete`, { keys })
};

/**
 * DNS API
 */
export const dnsAPI = {
    // 获取DNS区域列表
    getZones: (accountId) => api.get(`/dns/${accountId}/zones`),

    // 获取DNS记录
    getRecords: (accountId, zoneId) => api.get(`/dns/${accountId}/zones/${zoneId}/records`),

    // 创建DNS记录
    createRecord: (accountId, zoneId, record) =>
        api.post(`/dns/${accountId}/zones/${zoneId}/records`, record),

    // 更新DNS记录
    updateRecord: (accountId, zoneId, recordId, record) =>
        api.put(`/dns/${accountId}/zones/${zoneId}/records/${recordId}`, record),

    // 删除DNS记录
    deleteRecord: (accountId, zoneId, recordId) =>
        api.delete(`/dns/${accountId}/zones/${zoneId}/records/${recordId}`),

    // 导出DNS记录
    exportRecords: (accountId, zoneId, format = 'bind') =>
        api.get(`/dns/${accountId}/zones/${zoneId}/export`, {
            params: { format },
            responseType: format === 'bind' ? 'blob' : 'json'
        }),

    // 导入DNS记录
    importRecords: (accountId, zoneId, file) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post(`/dns/${accountId}/zones/${zoneId}/import`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    }
};

/**
 * Pages API
 */
export const pagesAPI = {
    // 获取Pages项目列表
    getProjects: (accountId) => api.get(`/pages/${accountId}/projects`),

    // 获取部署列表
    getDeployments: (accountId, projectName) =>
        api.get(`/pages/${accountId}/projects/${projectName}/deployments`),

    // 创建部署
    createDeployment: (accountId, projectName, deployment) =>
        api.post(`/pages/${accountId}/projects/${projectName}/deployments`, deployment)
};

/**
 * D1 API
 */
export const d1API = {
    getDatabases: (accountId, page = 1, perPage = 20) =>
        api.get(`/d1/${accountId}/databases`, { params: { page, per_page: perPage } })
};

export default api;
