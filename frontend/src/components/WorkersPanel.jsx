import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Code, Plus, Trash2, Save, Edit, X, Search, Maximize, Minimize, Globe, Settings, FileJson, Check, Database, HardDrive, RotateCw } from 'lucide-react';
import Editor from '@monaco-editor/react';
import toast from 'react-hot-toast';
import { workersAPI, kvAPI, d1API } from '../services/api';
import ConfirmDialog from './ConfirmDialog';
import { SkeletonCard } from './SkeletonLoader';

function WorkersPanel({ accountId }) {
    const [workers, setWorkers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedWorker, setSelectedWorker] = useState(null);
    const [editorContent, setEditorContent] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newWorkerName, setNewWorkerName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, workerName: '', target: null });
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Settings Mode State
    const [activeTab, setActiveTab] = useState('code'); // 'code' | 'settings'
    const [bindings, setBindings] = useState([]);
    const [kvNamespaces, setKvNamespaces] = useState([]);
    const [d1Databases, setD1Databases] = useState([]);
    const [loadingSettings, setLoadingSettings] = useState(false);
    const [kvLoaded, setKvLoaded] = useState(false);
    const [d1Loaded, setD1Loaded] = useState(false);

    useEffect(() => {
        setWorkers([]);
        setKvNamespaces([]);
        setD1Databases([]);
        setBindings([]);
        setSelectedWorker(null);
        setEditorContent('');
        setSearchQuery('');
        setKvLoaded(false);
        setD1Loaded(false);
        loadWorkers();
    }, [accountId]);

    useEffect(() => {
        if (selectedWorker && activeTab === 'settings') {
            loadWorkerSettings(selectedWorker);
            // Only load KV/D1 data once per account session
            if (!kvLoaded) {
                loadKvNamespaces();
            }
            if (!d1Loaded) {
                loadD1Databases();
            }
        }
    }, [selectedWorker, activeTab, kvLoaded, d1Loaded]);

    // Debounce search query for better performance
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 300); // 300ms debounce

        return () => clearTimeout(handler);
    }, [searchQuery]);

    const loadWorkers = async () => {
        try {
            setLoading(true);
            const response = await workersAPI.getWorkers(accountId);
            if (response.data.success && response.data.data) {
                setWorkers(response.data.data.result || []);
            }
        } catch (error) {
            console.error('加载Workers失败:', error);
            setWorkers([]);
        } finally {
            setLoading(false);
        }
    };

    const loadKvNamespaces = async () => {
        try {
            const response = await kvAPI.getNamespaces(accountId);
            if (response.data.success && response.data.data) {
                setKvNamespaces(response.data.data.result || []);
                setKvLoaded(true);
            }
        } catch (error) {
            console.error('加载KV命名空间失败:', error);
        }
    };

    const loadD1Databases = async () => {
        try {
            const response = await d1API.getDatabases(accountId);
            if (response.data.success && response.data.data) {
                setD1Databases(response.data.data.result || []);
                setD1Loaded(true);
            }
        } catch (error) {
            console.error('加载D1数据库失败:', error);
        }
    };

    const loadWorkerScript = async (scriptName) => {
        try {
            const response = await workersAPI.getWorkerScript(accountId, scriptName);
            const scriptContent = response.data.data || response.data || '// Worker脚本';
            setEditorContent(typeof scriptContent === 'string' ? scriptContent : scriptContent.script || '// Worker脚本');
            setSelectedWorker(scriptName);
            setActiveTab('code');
            setIsEditing(false);
        } catch (error) {
            console.error('加载脚本错误:', error);
            toast.error('加载脚本失败');
        }
    };

    const loadWorkerSettings = async (scriptName) => {
        try {
            setLoadingSettings(true);
            const response = await workersAPI.getWorkerSettings(accountId, scriptName);
            const result = response.data.data?.result || {};

            // Transform bindings object to array and infer types
            const bindingArray = Object.entries(result.bindings || {}).map(([key, value]) => {
                // Infer binding type from structure
                let inferredType = value.type;

                // If no explicit type, infer from fields
                if (!inferredType) {
                    if (value.namespace_id) {
                        inferredType = 'kv_namespace';
                    } else if (value.database_id || value.id) {
                        inferredType = 'd1_database';
                    } else if (value.text !== undefined) {
                        inferredType = 'plain_text';
                    }
                }

                // Normalize D1 type
                if (inferredType === 'd1') {
                    inferredType = 'd1_database';
                }

                return {
                    name: key,
                    type: inferredType,
                    ...value
                };
            });
            setBindings(bindingArray);
        } catch (error) {
            console.error('加载设置失败:', error);
            toast.error('加载设置失败');
        } finally {
            setLoadingSettings(false);
        }
    };

    const saveSettings = async () => {
        try {
            const bindingsList = bindings
                .filter(b => b.name && b.name.trim()) // Filter out empty names
                .map(curr => {
                    if (curr.type === 'kv_namespace') {
                        if (curr.namespace_id && curr.namespace_id.trim()) {
                            return {
                                type: 'kv_namespace',
                                name: curr.name,
                                namespace_id: curr.namespace_id
                            };
                        }
                    } else if (curr.type === 'd1_database') {
                        if (curr.database_id && curr.database_id.trim()) {
                            return {
                                type: 'd1', // Correct API type for D1
                                name: curr.name,
                                id: curr.database_id // Correct API field for D1 ID
                            };
                        }
                    } else {
                        // plain_text
                        return {
                            type: 'plain_text',
                            name: curr.name,
                            text: curr.text || ''
                        };
                    }
                    return null;
                })
                .filter(b => b !== null); // Remove failed mappings

            await workersAPI.updateWorkerSettings(accountId, selectedWorker, {
                bindings: bindingsList
            });
            toast.success('设置保存成功');
            loadWorkerSettings(selectedWorker);
        } catch (error) {
            console.error('保存设置失败:', error);
            const errorMsg = error.response?.data?.details?.errors?.[0]?.message || '保存设置失败 (请检查控制台详情)';
            toast.error(errorMsg);
        }
    };

    // Memoize callback to prevent re-creation on every render
    const handleBindingChange = useCallback((index, field, value) => {
        setBindings(prevBindings => {
            const newBindings = [...prevBindings];
            newBindings[index][field] = value;
            return newBindings;
        });
    }, []);

    const addEnvVar = () => {
        setBindings([...bindings, { name: '', type: 'plain_text', text: '' }]);
    };

    const addKvBinding = () => {
        setBindings([...bindings, { name: '', type: 'kv_namespace', namespace_id: '' }]);
    };

    const addD1Binding = () => {
        setBindings([...bindings, { name: '', type: 'd1_database', database_id: '' }]);
    };

    const removeBinding = (index) => {
        const newBindings = bindings.filter((_, i) => i !== index);
        setBindings(newBindings);
    };

    const handleSave = () => {
        setIsEditing(false);
        toast.success('已保存编辑内容');
    };

    const deployWorkerScript = async () => {
        try {
            await workersAPI.updateWorker(accountId, selectedWorker, editorContent);
            toast.success('部署成功！Worker已更新');
            setIsEditing(false);
            loadWorkers();
        } catch (error) {
            toast.error('部署失败');
        }
    };

    const createWorker = async () => {
        if (!newWorkerName.trim()) {
            toast.error('请输入Worker名称');
            return;
        }

        try {
            const defaultScript = `addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
    return new Response('Hello from ${newWorkerName}!', {
        headers: { 'content-type': 'text/plain' }
    })
} `;

            await workersAPI.createWorker(accountId, {
                scriptName: newWorkerName,
                content: defaultScript
            });

            toast.success('Worker创建成功！');
            setShowCreateModal(false);
            setNewWorkerName('');
            loadWorkers();
        } catch (error) {
            toast.error('创建失败');
        }
    };

    const deleteWorker = async (scriptName) => {
        setConfirmDialog({ isOpen: false, worker: null });

        try {
            await workersAPI.deleteWorker(accountId, scriptName);
            toast.success('删除成功！');
            if (selectedWorker === scriptName) {
                setSelectedWorker(null);
                setEditorContent('');
            }
            loadWorkers();
        } catch (error) {
            toast.error('删除失败');
        }
    };

    // 快捷键支持
    useEffect(() => {
        const handleKeyPress = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (selectedWorker && activeTab === 'code' && isEditing) {
                    handleSave();
                } else if (selectedWorker && activeTab === 'settings') {
                    saveSettings();
                }
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                if (selectedWorker && activeTab === 'code') {
                    deployWorkerScript();
                }
            }
            if (e.key === 'Escape') {
                if (isEditing) setIsEditing(false);
                else if (showCreateModal) setShowCreateModal(false);
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [selectedWorker, isEditing, showCreateModal, activeTab, bindings]);

    // Memoize filtered workers to avoid recalculation on every render
    const filteredWorkers = useMemo(() => {
        return workers.filter(worker =>
            worker.id.toLowerCase().includes(debouncedSearch.toLowerCase())
        );
    }, [workers, debouncedSearch]);

    if (loading) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="card">
                    <h3 className="text-lg font-semibold text-gray-200 mb-4">Workers</h3>
                    <div className="space-y-2"><SkeletonCard count={5} /></div>
                </div>
                <div className="lg:col-span-2 card">
                    <div className="h-64 flex items-center justify-center text-gray-500">
                        加载中...
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
            {/* Workers列表 Sidebar */}
            <div className="card flex flex-col h-full">
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                    <h3 className="text-lg font-semibold text-gray-200">Workers</h3>
                    <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
                        <Plus className="w-4 h-4" />
                    </button>
                </div>

                {/* 搜索框 */}
                <div className="mb-4 flex-shrink-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="搜索Worker..."
                            className="input pl-10"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-thin space-y-2 pr-1">
                    {filteredWorkers.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            {searchQuery ? '未找到匹配的Worker' : '暂无Worker'}
                        </div>
                    ) : (
                        filteredWorkers.map((worker) => (
                            <div
                                key={worker.id}
                                className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 group relative ${selectedWorker === worker.id
                                    ? 'border-primary-500 bg-primary-500/10'
                                    : 'border-dark-700 bg-dark-800/50 hover:bg-dark-700 hover:border-dark-600'
                                    }`}
                                onClick={() => loadWorkerScript(worker.id)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded ${selectedWorker === worker.id ? 'bg-primary-500/20 text-primary-400' : 'bg-dark-700 text-gray-400'}`}>
                                            <Globe className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-200">{worker.id}</div>
                                            <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                                                <span>{new Date(worker.modified_on).toLocaleDateString()}</span>
                                                {worker.routes?.[0] && (
                                                    <span className="bg-dark-800 px-1.5 py-0.5 rounded text-gray-400 border border-dark-600">
                                                        {worker.routes[0].pattern}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setConfirmDialog({ isOpen: true, target: worker, workerName: worker.id });
                                        }}
                                        className="p-2 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                        title="删除"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* 右侧主区域 */}
            <div className={`lg:col-span-2 card flex flex-col h-full ${isFullscreen ? 'fixed inset-0 z-50 m-0 rounded-none' : ''}`}>
                {selectedWorker ? (
                    <>
                        {/* Header & Tabs */}
                        <div className="flex items-center justify-between mb-4 border-b border-dark-700 pb-2 flex-shrink-0">
                            <div className="flex items-center gap-4">
                                <h3 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
                                    <Globe className="w-5 h-5 text-primary-400" />
                                    {selectedWorker}
                                </h3>
                                <div className="flex bg-dark-800/50 rounded-lg p-1 border border-dark-700">
                                    <button
                                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'code' ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'
                                            }`}
                                        onClick={() => setActiveTab('code')}
                                    >
                                        代码编辑
                                    </button>
                                    <button
                                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'settings' ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'
                                            }`}
                                        onClick={() => setActiveTab('settings')}
                                    >
                                        变量设置
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                {activeTab === 'code' && (
                                    <>
                                        {isEditing ? (
                                            <>
                                                <button onClick={handleSave} className="btn btn-secondary">
                                                    <Save className="w-4 h-4" />
                                                    保存
                                                </button>
                                                <button onClick={deployWorkerScript} className="btn btn-primary">
                                                    <Check className="w-4 h-4" />
                                                    部署
                                                </button>
                                                <button onClick={() => setIsEditing(false)} className="btn btn-ghost">取消</button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => setIsEditing(true)} className="btn btn-primary">
                                                    <Edit className="w-4 h-4" />
                                                    编辑
                                                </button>
                                                <button onClick={deployWorkerScript} className="btn btn-secondary">
                                                    部署
                                                </button>
                                            </>
                                        )}
                                        <button
                                            onClick={() => setIsFullscreen(!isFullscreen)}
                                            className="btn btn-ghost"
                                            title={isFullscreen ? '退出全屏' : '全屏编辑'}
                                        >
                                            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-hidden relative">
                            {activeTab === 'code' && (
                                <div className={`h-full border border-dark-700 rounded-lg overflow-hidden`}>
                                    <Editor
                                        height="100%"
                                        defaultLanguage="javascript"
                                        theme="vs-dark"
                                        value={editorContent}
                                        onChange={(value) => setEditorContent(value || '')}
                                        options={{
                                            readOnly: !isEditing,
                                            minimap: { enabled: false }, // Disable minimap for better performance
                                            fontSize: 14,
                                            lineNumbers: 'on',
                                            scrollBeyondLastLine: false,
                                            automaticLayout: true,
                                            tabSize: 2,
                                            wordWrap: 'on',
                                            folding: false, // Disable code folding for performance
                                            glyphMargin: false, // Disable glyph margin
                                            lineDecorationsWidth: 10,
                                            lineNumbersMinChars: 3,
                                            renderLineHighlight: 'line',
                                            scrollbar: {
                                                vertical: 'auto',
                                                horizontal: 'auto',
                                                useShadows: false, // Disable shadows
                                                verticalScrollbarSize: 10,
                                                horizontalScrollbarSize: 10
                                            },
                                            suggest: {
                                                showWords: false // Disable word-based suggestions
                                            }
                                        }}
                                        loading={<div className="flex items-center justify-center h-full text-gray-500">加载编辑器...</div>}
                                    />
                                </div>
                            )}

                            {activeTab === 'settings' && (
                                <div className="h-full overflow-y-auto pr-2">
                                    {loadingSettings ? (
                                        <div className="text-center py-10 text-gray-500">加载设置中...</div>
                                    ) : (
                                        <div className="space-y-8">
                                            {/* 环境变量 */}
                                            <div className="bg-dark-800/50 rounded-lg p-5 border border-dark-700">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <FileJson className="w-5 h-5 text-primary-400" />
                                                        <h4 className="text-lg font-medium text-gray-200">环境变量 (Plain Text)</h4>
                                                    </div>
                                                    <button onClick={addEnvVar} className="btn btn-secondary text-xs">
                                                        <Plus className="w-3 h-3" /> 添加变量
                                                    </button>
                                                </div>

                                                <div className="overflow-x-auto rounded-lg border border-dark-700">
                                                    <table className="w-full">
                                                        <thead>
                                                            <tr className="bg-dark-800 border-b border-dark-700">
                                                                <th className="text-left py-3 px-4 text-gray-400 font-medium w-1/3">变量名</th>
                                                                <th className="text-left py-3 px-4 text-gray-400 font-medium">值</th>
                                                                <th className="text-right py-3 px-4 text-gray-400 font-medium w-16">操作</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {bindings.filter(b => b.type === 'plain_text').length === 0 ? (
                                                                <tr>
                                                                    <td colSpan={3} className="text-center py-6 text-gray-500">
                                                                        暂无环境变量
                                                                    </td>
                                                                </tr>
                                                            ) : (
                                                                bindings.map((binding, index) => {
                                                                    if (binding.type !== 'plain_text') return null;
                                                                    return (
                                                                        <tr key={index} className="border-b border-dark-700/50 last:border-0 hover:bg-dark-700/30">
                                                                            <td className="p-3">
                                                                                <input
                                                                                    type="text"
                                                                                    value={binding.name}
                                                                                    onChange={(e) => handleBindingChange(index, 'name', e.target.value)}
                                                                                    placeholder="VARIABLE_NAME"
                                                                                    className="input py-1.5 font-mono text-sm"
                                                                                />
                                                                            </td>
                                                                            <td className="p-3">
                                                                                <input
                                                                                    type="text"
                                                                                    value={binding.text || ''}
                                                                                    onChange={(e) => handleBindingChange(index, 'text', e.target.value)}
                                                                                    placeholder="Value"
                                                                                    className="input py-1.5 font-mono text-sm"
                                                                                />
                                                                            </td>
                                                                            <td className="p-3 text-center">
                                                                                <button
                                                                                    onClick={() => removeBinding(index)}
                                                                                    className="text-gray-500 hover:text-red-400 transition-colors"
                                                                                    title="移除"
                                                                                >
                                                                                    <Trash2 className="w-4 h-4" />
                                                                                </button>
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>

                                            {/* KV 命名空间绑定 */}
                                            <div className="bg-dark-800/50 rounded-lg p-5 border border-dark-700">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <Database className="w-5 h-5 text-purple-400" />
                                                        <h4 className="text-lg font-medium text-gray-200">
                                                            KV 命名空间 (KV Namespace)
                                                            <span className="text-xs text-gray-500 ml-2 font-normal">
                                                                ({kvNamespaces.length} loaded)
                                                            </span>
                                                        </h4>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={async () => {
                                                                const toastId = toast.loading('刷新KV列表...');
                                                                try {
                                                                    setKvNamespaces([]);
                                                                    setKvLoaded(false);
                                                                    const response = await kvAPI.getNamespaces(accountId);
                                                                    if (response.data.success && response.data.data) {
                                                                        setKvNamespaces(response.data.data.result || []);
                                                                        setKvLoaded(true);
                                                                        toast.success(`已加载 ${response.data.data.result.length || 0} 个命名空间`, { id: toastId });
                                                                    } else {
                                                                        toast.error('刷新失败', { id: toastId });
                                                                    }
                                                                } catch (err) {
                                                                    toast.error('刷新错误', { id: toastId });
                                                                }
                                                            }}
                                                            className="btn btn-ghost text-xs p-1 h-7"
                                                            title="刷新KV列表"
                                                        >
                                                            <RotateCw className="w-3 h-3" />
                                                        </button>
                                                        <button onClick={addKvBinding} className="btn btn-secondary text-xs">
                                                            <Plus className="w-3 h-3" /> 添加KV绑定
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="overflow-x-auto rounded-lg border border-dark-700">
                                                    <table className="w-full">
                                                        <thead>
                                                            <tr className="bg-dark-800 border-b border-dark-700">
                                                                <th className="text-left py-3 px-4 text-gray-400 font-medium w-1/3">绑定名称 (Binding Name)</th>
                                                                <th className="text-left py-3 px-4 text-gray-400 font-medium">KV 命名空间</th>
                                                                <th className="text-right py-3 px-4 text-gray-400 font-medium w-16">操作</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {bindings.filter(b => b.type === 'kv_namespace').length === 0 ? (
                                                                <tr>
                                                                    <td colSpan={3} className="text-center py-6 text-gray-500">
                                                                        暂无KV绑定
                                                                    </td>
                                                                </tr>
                                                            ) : (
                                                                bindings.map((binding, index) => {
                                                                    if (binding.type !== 'kv_namespace') return null;
                                                                    return (
                                                                        <tr key={index} className="border-b border-dark-700/50 last:border-0 hover:bg-dark-700/30">
                                                                            <td className="p-3">
                                                                                <input
                                                                                    type="text"
                                                                                    value={binding.name}
                                                                                    onChange={(e) => handleBindingChange(index, 'name', e.target.value)}
                                                                                    placeholder="MY_KV"
                                                                                    className="input py-1.5 font-mono text-sm"
                                                                                />
                                                                            </td>
                                                                            <td className="p-3">
                                                                                <div className="flex flex-col gap-1">
                                                                                    <select
                                                                                        value={binding.namespace_id || ''}
                                                                                        onChange={(e) => handleBindingChange(index, 'namespace_id', e.target.value)}
                                                                                        className="input py-1.5 font-mono text-sm"
                                                                                    >
                                                                                        <option value="">选择命名空间...</option>
                                                                                        {kvNamespaces.map(ns => (
                                                                                            <option key={ns.id} value={ns.id}>
                                                                                                {ns.title} ({ns.id})
                                                                                            </option>
                                                                                        ))}
                                                                                        {!kvNamespaces.find(ns => ns.id === binding.namespace_id) && binding.namespace_id && (
                                                                                            <option value={binding.namespace_id}>
                                                                                                {binding.namespace_id} (未知/未加载)
                                                                                            </option>
                                                                                        )}
                                                                                    </select>
                                                                                    {/* Allow manual entry if needed, or just show the ID if it's not in the list */}
                                                                                    {!kvNamespaces.some(ns => ns.id === binding.namespace_id) && binding.namespace_id && (
                                                                                        <span className="text-xs text-yellow-500">
                                                                                            注意: 此ID未在您的KV列表中找到
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            </td>
                                                                            <td className="p-3 text-center">
                                                                                <button
                                                                                    onClick={() => removeBinding(index)}
                                                                                    className="text-gray-500 hover:text-red-400 transition-colors"
                                                                                    title="移除"
                                                                                >
                                                                                    <Trash2 className="w-4 h-4" />
                                                                                </button>
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>

                                            {/* D1 数据库绑定 */}
                                            <div className="bg-dark-800/50 rounded-lg p-5 border border-dark-700">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <HardDrive className="w-5 h-5 text-blue-400" />
                                                        <h4 className="text-lg font-medium text-gray-200">D1 数据库 (D1 Database)
                                                            <span className="text-xs text-gray-500 ml-2 font-normal">
                                                                ({d1Databases.length} loaded)
                                                            </span>
                                                        </h4>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={async () => {
                                                                const toastId = toast.loading('刷新D1列表...');
                                                                try {
                                                                    setD1Databases([]);
                                                                    setD1Loaded(false);
                                                                    const response = await d1API.getDatabases(accountId);
                                                                    if (response.data.success && response.data.data) {
                                                                        setD1Databases(response.data.data.result || []);
                                                                        setD1Loaded(true);
                                                                        toast.success(`已加载 ${response.data.data.result.length || 0} 个数据库`, { id: toastId });
                                                                    } else {
                                                                        toast.error('刷新失败', { id: toastId });
                                                                    }
                                                                } catch (err) {
                                                                    toast.error('刷新错误', { id: toastId });
                                                                }
                                                            }}
                                                            className="btn btn-ghost text-xs p-1 h-7"
                                                            title="刷新D1列表"
                                                        >
                                                            <RotateCw className="w-3 h-3" />
                                                        </button>
                                                        <button onClick={addD1Binding} className="btn btn-secondary text-xs">
                                                            <Plus className="w-3 h-3" /> 添加D1绑定
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="overflow-x-auto rounded-lg border border-dark-700">
                                                    <table className="w-full">
                                                        <thead>
                                                            <tr className="bg-dark-800 border-b border-dark-700">
                                                                <th className="text-left py-3 px-4 text-gray-400 font-medium w-1/3">绑定名称 (Binding Name)</th>
                                                                <th className="text-left py-3 px-4 text-gray-400 font-medium">数据库 (Database)</th>
                                                                <th className="text-right py-3 px-4 text-gray-400 font-medium w-16">操作</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {bindings.filter(b => b.type === 'd1' || b.type === 'd1_database').length === 0 ? (
                                                                <tr>
                                                                    <td colSpan={3} className="text-center py-6 text-gray-500">
                                                                        暂无D1绑定
                                                                    </td>
                                                                </tr>
                                                            ) : (
                                                                bindings.map((binding, index) => {
                                                                    if (binding.type !== 'd1' && binding.type !== 'd1_database') return null;
                                                                    // Normalize database ID handling (API uses 'id', previous code might use 'database_id')
                                                                    const currentDbId = binding.id || binding.database_id || '';
                                                                    return (
                                                                        <tr key={index} className="border-b border-dark-700/50 last:border-0 hover:bg-dark-700/30">
                                                                            <td className="p-3">
                                                                                <input
                                                                                    type="text"
                                                                                    value={binding.name}
                                                                                    onChange={(e) => handleBindingChange(index, 'name', e.target.value)}
                                                                                    placeholder="MY_DB"
                                                                                    className="input py-1.5 font-mono text-sm"
                                                                                />
                                                                            </td>
                                                                            <td className="p-3">
                                                                                <div className="flex flex-col gap-1">
                                                                                    <select
                                                                                        value={currentDbId}
                                                                                        onChange={(e) => {
                                                                                            // Update both possible fields to be safe, though saveSettings normalizes it
                                                                                            const newBindings = [...bindings];
                                                                                            newBindings[index].database_id = e.target.value;
                                                                                            newBindings[index].id = e.target.value;
                                                                                            setBindings(newBindings);
                                                                                        }}
                                                                                        className="input py-1.5 font-mono text-sm"
                                                                                    >
                                                                                        <option value="">选择数据库...</option>
                                                                                        {d1Databases.map(db => (
                                                                                            <option key={db.uuid} value={db.uuid}>
                                                                                                {db.name} ({db.uuid.substring(0, 8)}...)
                                                                                            </option>
                                                                                        ))}
                                                                                        {!d1Databases.find(db => db.uuid === currentDbId) && currentDbId && (
                                                                                            <option value={currentDbId}>
                                                                                                {currentDbId} (未知/未加载)
                                                                                            </option>
                                                                                        )}
                                                                                    </select>
                                                                                    {!d1Databases.some(db => db.uuid === currentDbId) && currentDbId && (
                                                                                        <span className="text-xs text-yellow-500">
                                                                                            注意: 此ID未在您的D1列表中找到
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            </td>
                                                                            <td className="p-3 text-center">
                                                                                <button
                                                                                    onClick={() => removeBinding(index)}
                                                                                    className="text-gray-500 hover:text-red-400 transition-colors"
                                                                                    title="移除"
                                                                                >
                                                                                    <Trash2 className="w-4 h-4" />
                                                                                </button>
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>

                                            <div className="mt-4 flex justify-end">
                                                <button onClick={saveSettings} className="btn btn-primary">
                                                    <Save className="w-4 h-4" />
                                                    保存所有设置
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500">
                        <Code className="w-16 h-16 mb-4 opacity-20" />
                        <p>请选择左侧Worker进行编辑或设置</p>
                    </div>
                )}
            </div>

            {/* 创建Worker模态框 */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="card glass max-w-md w-full">
                        <h3 className="text-xl font-bold mb-4">创建新Worker</h3>
                        <input
                            type="text"
                            value={newWorkerName}
                            onChange={(e) => setNewWorkerName(e.target.value)}
                            placeholder="Worker名称"
                            className="input mb-4"
                        />
                        <div className="flex gap-3">
                            <button onClick={createWorker} className="btn btn-primary flex-1">创建</button>
                            <button onClick={() => setShowCreateModal(false)} className="btn btn-secondary">取消</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 确认删除对话框 */}
            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog({ isOpen: false, workerName: '', target: null })}
                onConfirm={() => deleteWorker(confirmDialog.target?.id)}
                title="删除Worker"
                message={`确定要删除Worker "${confirmDialog.target?.id}"吗？此操作无法撤销。`}
                confirmText="删除"
                cancelText="取消"
                type="danger"
            />
        </div>
    );
}

export default WorkersPanel;
