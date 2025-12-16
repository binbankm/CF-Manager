import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Database, Plus, Trash2, Edit, Search, Upload, Download, CheckSquare, Square, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { kvAPI } from '../services/api';
import ConfirmDialog from './ConfirmDialog';
import { SkeletonCard } from './SkeletonLoader';
import { useDebounce } from '../hooks/useDebounce';

const KVPanel = ({ accountId }) => {
    const [namespaces, setNamespaces] = useState([]);
    const [selectedNamespace, setSelectedNamespace] = useState(null);
    const [keys, setKeys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateNS, setShowCreateNS] = useState(false);
    const [showEditKey, setShowEditKey] = useState(false);
    const [newNSName, setNewNSName] = useState('');
    const [editingKey, setEditingKey] = useState({ key: '', value: '' });
    const [searchPrefix, setSearchPrefix] = useState('');
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, type: 'namespace', item: null });
    const [showBulkImport, setShowBulkImport] = useState(false);
    const [importData, setImportData] = useState('');
    const [selectedKeys, setSelectedKeys] = useState([]);
    const [isBulkMode, setIsBulkMode] = useState(false);

    useEffect(() => {
        loadNamespaces();
    }, [accountId]);

    // 使用防抖优化搜索，避免每次输入都请求API
    const debouncedSearchPrefix = useDebounce(searchPrefix, 300);

    useEffect(() => {
        if (selectedNamespace) {
            loadKeys();
        }
    }, [selectedNamespace, debouncedSearchPrefix, loadKeys]);

    const loadNamespaces = async () => {
        try {
            setLoading(true);
            const response = await kvAPI.getNamespaces(accountId);
            if (response.data.success && response.data.data) {
                setNamespaces(response.data.data.result || []);
            }
        } catch (error) {
            console.error('加载命名空间失败:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadKeys = useCallback(async () => {
        if (!selectedNamespace) return;
        try {
            const response = await kvAPI.getKeys(accountId, selectedNamespace.id, debouncedSearchPrefix);
            if (response.data.success && response.data.data) {
                setKeys(response.data.data.result || []);
            }
        } catch (error) {
            console.error('加载键列表失败:', error);
        }
    }, [accountId, selectedNamespace, debouncedSearchPrefix]);

    const createNamespace = async () => {
        if (!newNSName.trim()) {
            toast.error('请输入命名空间名称');
            return;
        }

        try {
            await kvAPI.createNamespace(accountId, newNSName);
            toast.success('命名空间创建成功！');
            setShowCreateNS(false);
            setNewNSName('');
            loadNamespaces();
        } catch (error) {
            toast.error('创建失败');
        }
    };

    const deleteNamespace = async (namespaceId, title) => {
        setConfirmDialog({ isOpen: false, type: 'namespace', item: null });

        try {
            await kvAPI.deleteNamespace(accountId, namespaceId);
            toast.success('删除成功！');
            if (selectedNamespace?.id === namespaceId) {
                setSelectedNamespace(null);
            }
            loadNamespaces();
        } catch (error) {
            toast.error('删除失败');
        }
    };

    const saveKey = async () => {
        if (!editingKey.key.trim()) {
            toast.error('请输入键名');
            return;
        }

        try {
            await kvAPI.setValue(accountId, selectedNamespace.id, editingKey.key, editingKey.value);
            toast.success('保存成功！');
            setShowEditKey(false);
            setEditingKey({ key: '', value: '' });
            loadKeys();
        } catch (error) {
            toast.error('保存失败');
        }
    };

    const deleteKey = async (key) => {
        setConfirmDialog({ isOpen: false, type: 'key', item: null });

        try {
            await kvAPI.deleteKey(accountId, selectedNamespace.id, key);
            toast.success('删除成功！');
            loadKeys();
        } catch (error) {
            toast.error('删除失败');
        }
    };

    const editKey = async (key) => {
        try {
            const response = await kvAPI.getValue(accountId, selectedNamespace.id, key);
            let displayValue = response.data;

            // 智能格式化JSON
            if (typeof displayValue === 'string') {
                try {
                    const parsed = JSON.parse(displayValue);
                    displayValue = JSON.stringify(parsed, null, 2);
                } catch (e) {
                    // 不是JSON，保持原样
                }
            } else if (typeof displayValue === 'object' && displayValue !== null) {
                // 如果已经是对象，格式化为JSON字符串
                displayValue = JSON.stringify(displayValue, null, 2);
            }

            setEditingKey({ key, value: displayValue || '' });
            setShowEditKey(true);
        } catch (error) {
            toast.error('加载值失败');
        }
    };

    const handleBulkImport = async () => {
        try {
            const data = JSON.parse(importData);
            if (!Array.isArray(data)) {
                toast.error('导入数据格式错误，应为数组');
                return;
            }

            const response = await kvAPI.bulkImport(accountId, selectedNamespace.id, data);
            toast.success(response.data.message || '导入成功');
            setShowBulkImport(false);
            setImportData('');
            loadKeys();
        } catch (error) {
            toast.error(error.response?.data?.message || 'JSON格式错误');
        }
    };

    const exportKeys = async () => {
        try {
            const response = await kvAPI.exportData(accountId, selectedNamespace.id);
            const dataStr = JSON.stringify(response.data.data, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${selectedNamespace.title}-export.json`;
            link.click();
            URL.revokeObjectURL(url);
            toast.success('导出成功！');
        } catch (error) {
            toast.error('导出失败');
        }
    };

    const toggleBulkMode = useCallback(() => {
        setIsBulkMode(prev => !prev);
        setSelectedKeys([]);
    }, []);

    const toggleKeySelection = useCallback((keyName) => {
        setSelectedKeys(prev =>
            prev.includes(keyName)
                ? prev.filter(k => k !== keyName)
                : [...prev, keyName]
        );
    }, []);

    const bulkDeleteKeys = async () => {
        if (selectedKeys.length === 0) {
            toast.error('请选择要删除的键');
            return;
        }

        try {
            const response = await kvAPI.bulkDelete(accountId, selectedNamespace.id, selectedKeys);
            toast.success(response.data.message || '删除成功');
            setSelectedKeys([]);
            setIsBulkMode(false);
            loadKeys();
        } catch (error) {
            toast.error('批量删除失败');
        }
    };

    const copyToClipboard = useCallback((text) => {
        navigator.clipboard.writeText(text);
        toast.success('已复制到剪贴板');
    }, []);

    if (loading) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="card">
                    <h3 className="text-lg font-semibold text-gray-200 mb-4">KV命名空间</h3>
                    <div className="space-y-2"><SkeletonCard count={4} /></div>
                </div>
                <div className="lg:col-span-2 card">
                    <h3 className="text-lg font-semibold text-gray-200 mb-4">键值对</h3>
                    <div className="space-y-2"><SkeletonCard count={6} /></div>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 命名空间列表 */}
            <div className="card">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-200">KV命名空间</h3>
                    <button onClick={() => setShowCreateNS(true)} className="btn btn-primary">
                        <Plus className="w-4 h-4" />
                    </button>
                </div>

                <div className="space-y-2 max-h-[600px] overflow-y-auto scrollbar-thin">
                    {namespaces.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">暂无命名空间</p>
                    ) : (
                        namespaces.map((ns) => (
                            <div
                                key={ns.id}
                                className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedNamespace?.id === ns.id
                                    ? 'border-primary-500 bg-primary-500/10'
                                    : 'border-dark-700 bg-dark-800/50 hover:border-dark-600'
                                    }`}
                                onClick={() => setSelectedNamespace(ns)}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Database className="w-4 h-4 text-primary-400" />
                                            <span className="font-medium text-gray-200">{ns.title}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">{ns.id}</p>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setConfirmDialog({ isOpen: true, type: 'namespace', item: { id: ns.id, title: ns.title } });
                                        }}
                                        className="text-red-400 hover:text-red-300"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* 键值列表 */}
            <div className="lg:col-span-2 card">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-200">
                        {selectedNamespace ? `键值对: ${selectedNamespace.title}` : '请选择命名空间'}
                    </h3>
                    {selectedNamespace && (
                        <div className="flex gap-2">
                            {isBulkMode ? (
                                <>
                                    <button
                                        onClick={bulkDeleteKeys}
                                        disabled={selectedKeys.length === 0}
                                        className="btn btn-danger disabled:opacity-50"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        删除选中({selectedKeys.length})
                                    </button>
                                    <button onClick={toggleBulkMode} className="btn btn-secondary">
                                        取消选择
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => setShowBulkImport(true)} className="btn btn-secondary">
                                        <Upload className="w-4 h-4" />
                                        导入
                                    </button>
                                    <button onClick={exportKeys} className="btn btn-secondary">
                                        <Download className="w-4 h-4" />
                                        导出
                                    </button>
                                    <button onClick={toggleBulkMode} className="btn btn-secondary">
                                        <CheckSquare className="w-4 h-4" />
                                        批量选择
                                    </button>
                                    <button
                                        onClick={() => {
                                            setEditingKey({ key: '', value: '' });
                                            setShowEditKey(true);
                                        }}
                                        className="btn btn-primary"
                                    >
                                        <Plus className="w-4 h-4" />
                                        添加
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {selectedNamespace && (
                    <>
                        {/* 搜索 */}
                        <div className="mb-4 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                            <input
                                type="text"
                                value={searchPrefix}
                                onChange={(e) => setSearchPrefix(e.target.value)}
                                placeholder="搜索键（前缀匹配）"
                                className="input pl-10"
                            />
                        </div>

                        {/* 键列表 Table */}
                        <div className="card overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-dark-700">
                                            <th className="text-left py-3 px-4 text-gray-400 font-medium">键</th>
                                            <th className="text-left py-3 px-4 text-gray-400 font-medium hidden sm:table-cell">元数据</th>
                                            <th className="text-right py-3 px-4 text-gray-400 font-medium">操作</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {keys.length === 0 ? (
                                            <tr>
                                                <td colSpan={3} className="text-center py-8 text-gray-500">
                                                    暂无键值对
                                                </td>
                                            </tr>
                                        ) : (
                                            keys.map((item) => (
                                                <tr key={item.name} className="border-b border-dark-800 hover:bg-dark-800/50 transition-colors duration-150">
                                                    <td className="py-3 px-4 text-gray-300 font-mono">
                                                        <div className="flex items-center gap-3">
                                                            {isBulkMode && (
                                                                <button onClick={() => toggleKeySelection(item.name)}>
                                                                    {selectedKeys.includes(item.name) ? (
                                                                        <CheckSquare className="w-5 h-5 text-primary-400" />
                                                                    ) : (
                                                                        <Square className="w-5 h-5 text-gray-500" />
                                                                    )}
                                                                </button>
                                                            )}
                                                            <div className="flex items-center gap-2 group">
                                                                <span>{item.name}</span>
                                                                <button
                                                                    onClick={() => copyToClipboard(item.name)}
                                                                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-primary-400 transition-all p-1"
                                                                    title="复制键名"
                                                                >
                                                                    <Copy className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 text-gray-500 text-sm hidden sm:table-cell">
                                                        {item.metadata ? JSON.stringify(item.metadata) : '-'}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <div className="flex justify-end gap-2">
                                                            {!isBulkMode && (
                                                                <>
                                                                    <button
                                                                        onClick={() => editKey(item.name)}
                                                                        className="text-primary-400 hover:text-primary-300"
                                                                        title="查看/编辑"
                                                                    >
                                                                        <Edit className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setConfirmDialog({ isOpen: true, type: 'key', item: { key: item.name } })}
                                                                        className="text-red-400 hover:text-red-300"
                                                                        title="删除"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {/* 创建命名空间模态框 */}
                {showCreateNS && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="card glass max-w-md w-full">
                            <h3 className="text-xl font-bold mb-4">创建KV命名空间</h3>
                            <input
                                type="text"
                                value={newNSName}
                                onChange={(e) => setNewNSName(e.target.value)}
                                placeholder="命名空间名称"
                                className="input mb-4"
                            />
                            <div className="flex gap-3">
                                <button onClick={createNamespace} className="btn btn-primary flex-1">创建</button>
                                <button onClick={() => setShowCreateNS(false)} className="btn btn-secondary">取消</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 编辑键值模态框 */}
                {showEditKey && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="card glass max-w-lg w-full">
                            <h3 className="text-xl font-bold mb-4">
                                {editingKey.key ? '编辑键值' : '添加键值'}
                            </h3>
                            <div className="space-y-4 mb-4">
                                <input
                                    type="text"
                                    value={editingKey.key}
                                    onChange={(e) => setEditingKey({ ...editingKey, key: e.target.value })}
                                    placeholder="键名"
                                    disabled={!!editingKey.key}
                                    className="input"
                                />
                                <textarea
                                    value={editingKey.value}
                                    onChange={(e) => setEditingKey({ ...editingKey, value: e.target.value })}
                                    placeholder="值"
                                    rows={8}
                                    className="input font-mono text-sm"
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setShowEditKey(false)}
                                    className="btn btn-secondary"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={saveKey}
                                    className="btn btn-primary"
                                    disabled={!editingKey.key || !editingKey.value}
                                >
                                    保存
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 批量导入模态框 */}
                {showBulkImport && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="card glass max-w-2xl w-full">
                            <h3 className="text-xl font-bold mb-4">批量导入键值对</h3>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    JSON数据 (数组格式)
                                </label>
                                <textarea
                                    value={importData}
                                    onChange={(e) => setImportData(e.target.value)}
                                    className="input h-64 font-mono text-sm"
                                    placeholder={`[
  {
    "key": "example_key",
    "value": "example_value",
    "metadata": {}
  }
]`}
                                />
                                <p className="text-xs text-gray-500 mt-2">
                                    请确保输入合法的JSON数组。如果有重复的键，原有的值将被覆盖。
                                </p>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setShowBulkImport(false)}
                                    className="btn btn-secondary"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleBulkImport}
                                    className="btn btn-primary"
                                    disabled={!importData}
                                >
                                    <Upload className="w-4 h-4" />
                                    开始导入
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 确认对话框 */}
                <ConfirmDialog
                    isOpen={confirmDialog.isOpen}
                    onClose={() => setConfirmDialog({ isOpen: false, type: 'namespace', item: null })}
                    onConfirm={() => {
                        if (confirmDialog.type === 'namespace' && confirmDialog.item) {
                            deleteNamespace(confirmDialog.item.id, confirmDialog.item.title);
                        } else if (confirmDialog.type === 'key' && confirmDialog.item) {
                            deleteKey(confirmDialog.item.key);
                        }
                    }}
                    title={confirmDialog.type === 'namespace' ? '删除命名空间' : '删除键'}
                    message={
                        confirmDialog.type === 'namespace'
                            ? `确定要删除命名空间 "${confirmDialog.item?.title}"吗？所有键值对将被永久删除。`
                            : `确定要删除键 "${confirmDialog.item?.key}"吗？此操作无法撤销。`
                    }
                    confirmText="删除"
                    cancelText="取消"
                    type="danger"
                />
            </div>
        </div>
    );
};

export default React.memo(KVPanel);
