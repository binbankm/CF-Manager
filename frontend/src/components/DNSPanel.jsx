import React, { useState, useEffect, useRef } from 'react';
import { Globe, Plus, Edit, Trash2, Shield, ShieldOff, Search, Download, Upload, FileText, X, RotateCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { dnsAPI } from '../services/api';
import ConfirmDialog from './ConfirmDialog';
import { SkeletonCard, SkeletonTableRow } from './SkeletonLoader';

function DNSPanel({ accountId }) {
    const [zones, setZones] = useState([]);
    const [selectedZone, setSelectedZone] = useState(null);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showEditRecord, setShowEditRecord] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, record: null });
    const [showImportModal, setShowImportModal] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [isImporting, setIsImporting] = useState(false);

    useEffect(() => {
        loadZones();
    }, [accountId]);

    useEffect(() => {
        if (selectedZone) {
            loadRecords();
        }
    }, [selectedZone]);

    const loadZones = async () => {
        try {
            setLoading(true);
            const response = await dnsAPI.getZones(accountId);
            if (response.data.success && response.data.data) {
                setZones(response.data.data.result || []);
            }
        } catch (error) {
            console.error('加载区域失败:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadRecords = async () => {
        try {
            const response = await dnsAPI.getRecords(accountId, selectedZone.id);
            if (response.data.success && response.data.data) {
                setRecords(response.data.data.result || []);
            }
        } catch (error) {
            console.error('加载记录失败:', error);
        }
    };

    const saveRecord = async () => {
        try {
            if (editingRecord.id) {
                // 更新
                await dnsAPI.updateRecord(accountId, selectedZone.id, editingRecord.id, {
                    type: editingRecord.type,
                    name: editingRecord.name,
                    content: editingRecord.content,
                    ttl: parseInt(editingRecord.ttl) || 1,
                    proxied: editingRecord.proxied || false
                });
                toast.success('更新成功！');
            } else {
                // 创建
                await dnsAPI.createRecord(accountId, selectedZone.id, {
                    type: editingRecord.type,
                    name: editingRecord.name,
                    content: editingRecord.content,
                    ttl: parseInt(editingRecord.ttl) || 1,
                    proxied: editingRecord.proxied || false
                });
                toast.success('创建成功！');
            }
            setShowEditRecord(false);
            setEditingRecord(null);
            loadRecords();
        } catch (error) {
            toast.error('保存失败');
        }
    };

    const deleteRecord = async () => {
        if (!confirmDialog.record) return;

        try {
            await dnsAPI.deleteRecord(accountId, selectedZone.id, confirmDialog.record.id);
            toast.success('删除成功！');
            loadRecords();
        } catch (error) {
            toast.error('删除失败');
        } finally {
            setConfirmDialog({ ...confirmDialog, isOpen: false });
        }
    };

    // 导出DNS记录
    const exportRecords = async () => {
        try {
            const response = await dnsAPI.exportRecords(accountId, selectedZone.id, 'bind');
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `dns -export -${selectedZone.name}.txt`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('导出成功');
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('导出失败');
        }
    };

    // 导入记录
    const handleImportSubmit = async (e) => {
        e.preventDefault();
        if (!importFile) {
            toast.error('请选择文件');
            return;
        }

        try {
            setIsImporting(true);
            const response = await dnsAPI.importRecords(accountId, selectedZone.id, importFile);
            const { success, failed, details } = response.data.data;

            if (failed === 0) {
                toast.success(`成功导入 ${success} 条记录`);
            } else {
                toast.success(`导入完成: ${success} 成功, ${failed} 失败`);
                // 可以在这里显示失败详情，简单起见先打Log
                console.log('Import details:', details);
            }

            setShowImportModal(false);
            setImportFile(null);
            loadRecords(); // Changed from loadRecords(selectedZone.id) to loadRecords() as selectedZone is already in scope
        } catch (error) {
            console.error('Import failed:', error);
            toast.error('导入失败: ' + (error.response?.data?.message || error.message));
        } finally {
            setIsImporting(false);
        }
    };

    // 过滤DNS记录
    const filteredRecords = records.filter(record =>
        record.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.type.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const recordTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV', 'CAA'];

    if (loading) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="card">
                    <h3 className="text-lg font-semibold text-gray-200 mb-4">域名区域</h3>
                    <div className="space-y-2"><SkeletonCard count={5} /></div>
                </div>
                <div className="lg:col-span-3 card">
                    <h3 className="text-lg font-semibold text-gray-200 mb-4">DNS记录</h3>
                    <table className="w-full"><tbody><SkeletonTableRow rows={5} /></tbody></table>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* 域名区域列表 */}
            <div className="card">
                <h3 className="text-lg font-semibold text-gray-200 mb-4">域名区域</h3>
                <div className="space-y-2 max-h-[600px] overflow-y-auto scrollbar-thin">
                    {zones.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">暂无域名</p>
                    ) : (
                        zones.map((zone) => (
                            <div
                                key={zone.id}
                                className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${selectedZone?.id === zone.id
                                    ? 'border-primary-500 bg-primary-500/10'
                                    : 'border-dark-700 bg-dark-800/50 hover:bg-dark-700 hover:border-dark-600'
                                    } `}
                                onClick={() => setSelectedZone(zone)}
                            >
                                <div className="flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-primary-400" />
                                    <span className="font-medium text-gray-200">{zone.name}</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    {zone.status === 'active' ? '✓ 活跃' : zone.status}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* DNS记录列表 */}
            <div className="lg:col-span-3 card">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-200">
                        {selectedZone ? `DNS记录: ${selectedZone.name} ` : '请选择域名'}
                    </h3>
                    {selectedZone && (
                        <div className="flex gap-2">
                            <button onClick={() => setShowImportModal(true)} className="btn btn-secondary">
                                <Upload className="w-4 h-4" />
                                导入记录
                            </button>
                            <button onClick={exportRecords} className="btn btn-secondary">
                                <Download className="w-4 h-4" />
                                导出记录
                            </button>
                            <button
                                onClick={() => {
                                    setEditingRecord({ type: 'A', name: '', content: '', ttl: 1, proxied: false });
                                    setShowEditRecord(true);
                                }}
                                className="btn btn-primary"
                            >
                                <Plus className="w-4 h-4" />
                                添加记录
                            </button>
                        </div>
                    )}
                </div>

                {selectedZone && (
                    <>
                        {/* 搜索框 */}
                        <div className="mb-4 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="搜索DNS记录（名称/内容/类型）"
                                className="input pl-10"
                            />
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-dark-700">
                                        <th className="text-left py-3 px-4 text-gray-400 font-medium">类型</th>
                                        <th className="text-left py-3 px-4 text-gray-400 font-medium">名称</th>
                                        <th className="text-left py-3 px-4 text-gray-400 font-medium">内容</th>
                                        <th className="text-left py-3 px-4 text-gray-400 font-medium">TTL</th>
                                        <th className="text-left py-3 px-4 text-gray-400 font-medium">代理</th>
                                        <th className="text-right py-3 px-4 text-gray-400 font-medium">操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRecords.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="text-center py-8 text-gray-500">
                                                {searchQuery ? '未找到匹配的记录' : '暂无DNS记录'}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredRecords.map((record) => (
                                            <tr key={record.id} className="border-b border-dark-800 hover:bg-dark-800/50">
                                                <td className="py-3 px-4">
                                                    <span className="px-2 py-1 bg-primary-500/20 text-primary-400 rounded text-sm font-medium">
                                                        {record.type}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-gray-300">{record.name}</td>
                                                <td className="py-3 px-4 text-gray-400 font-mono text-sm">{record.content}</td>
                                                <td className="py-3 px-4 text-gray-400">{record.ttl === 1 ? 'Auto' : record.ttl}</td>
                                                <td className="py-3 px-4">
                                                    {record.proxied ? (
                                                        <Shield className="w-4 h-4 text-primary-400" />
                                                    ) : (
                                                        <ShieldOff className="w-4 h-4 text-gray-600" />
                                                    )}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setEditingRecord(record);
                                                                setShowEditRecord(true);
                                                            }}
                                                            className="text-primary-400 hover:text-primary-300"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setConfirmDialog({ isOpen: true, record: { id: record.id, name: record.name } })}
                                                            className="text-red-400 hover:text-red-300"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {/* 导入模态框 */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="card glass max-w-lg w-full">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-gray-200">导入DNS记录</h3>
                            <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleImportSubmit}>
                            <div className="space-y-4">
                                <div className="p-4 border-2 border-dashed border-dark-600 rounded-lg hover:border-primary-500 transition-colors">
                                    <label className="flex flex-col items-center justify-center cursor-pointer">
                                        <FileText className="w-8 h-8 text-gray-400 mb-2" />
                                        <span className="text-sm text-gray-300">
                                            {importFile ? importFile.name : '点击选择 BIND 格式文件 (.txt)'}
                                        </span>
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept=".txt"
                                            onChange={(e) => setImportFile(e.target.files[0])}
                                        />
                                    </label>
                                </div>
                                <p className="text-xs text-gray-500">
                                    支持 BIND 格式导出文件。重复的记录可能会被重复创建。
                                </p>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowImportModal(false)}
                                    className="btn btn-secondary"
                                >
                                    取消
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={isImporting || !importFile}
                                >
                                    {isImporting ? <RotateCw className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                                    开始导入
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 编辑记录模态框 */}
            {showEditRecord && editingRecord && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="card glass max-w-lg w-full">
                        <h3 className="text-xl font-bold mb-4">
                            {editingRecord.id ? '编辑DNS记录' : '添加DNS记录'}
                        </h3>
                        <div className="space-y-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">类型</label>
                                <select
                                    value={editingRecord.type}
                                    onChange={(e) => setEditingRecord({ ...editingRecord, type: e.target.value })}
                                    className="input"
                                >
                                    {recordTypes.map((type) => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">名称</label>
                                <input
                                    type="text"
                                    value={editingRecord.name}
                                    onChange={(e) => setEditingRecord({ ...editingRecord, name: e.target.value })}
                                    placeholder="@、www、mail等"
                                    className="input"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">内容</label>
                                <input
                                    type="text"
                                    value={editingRecord.content}
                                    onChange={(e) => setEditingRecord({ ...editingRecord, content: e.target.value })}
                                    placeholder="IP地址或目标"
                                    className="input"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">TTL（秒）</label>
                                <input
                                    type="number"
                                    value={editingRecord.ttl}
                                    onChange={(e) => setEditingRecord({ ...editingRecord, ttl: e.target.value })}
                                    placeholder="1为自动"
                                    className="input"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="proxied"
                                    checked={editingRecord.proxied}
                                    onChange={(e) => setEditingRecord({ ...editingRecord, proxied: e.target.checked })}
                                    className="w-4 h-4"
                                />
                                <label htmlFor="proxied" className="text-sm text-gray-300">
                                    通过Cloudflare代理（橙色云）
                                </label>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={saveRecord} className="btn btn-primary flex-1">保存</button>
                            <button onClick={() => setShowEditRecord(false)} className="btn btn-secondary">取消</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 确认删除对话框 */}
            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog({ isOpen: false, record: null })}
                onConfirm={() => confirmDialog.record && deleteRecord(confirmDialog.record.id, confirmDialog.record.name)}
                title="删除DNS记录"
                message={`确定要删除DNS记录 "${confirmDialog.record?.name}"吗？此操作无法撤销。`}
                confirmText="删除"
                cancelText="取消"
                type="danger"
            />
        </div>
    );
}

export default DNSPanel;
