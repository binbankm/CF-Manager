import React, { useState, useEffect } from 'react';
import { Database, RotateCw, Search, Plus, HardDrive } from 'lucide-react';
import { d1API } from '../services/api';
import toast from 'react-hot-toast';
import { SkeletonCard } from './SkeletonLoader';

function D1Panel({ accountId }) {
    const [databases, setDatabases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadDatabases();
    }, [accountId]);

    const loadDatabases = async () => {
        try {
            setLoading(true);
            const response = await d1API.getDatabases(accountId);
            if (response.data.success && response.data.data) {
                setDatabases(response.data.data.result || []);
            }
        } catch (error) {
            console.error('Failed to load D1 databases:', error);
            toast.error('获取D1数据库列表失败');
        } finally {
            setLoading(false);
        }
    };

    const filteredDatabases = databases.filter(db =>
        db.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        db.uuid.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
                        <HardDrive className="w-8 h-8 text-blue-400" />
                        D1 数据库 (D1 Database)
                    </h2>
                    <p className="text-gray-400 mt-1">管理您的 Cloudflare D1 SQL 数据库</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={loadDatabases}
                        className="btn btn-secondary flex items-center gap-2"
                        title="刷新列表"
                    >
                        <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        刷新
                    </button>
                    {/* D1 creation is usually done via CLI or API. Basic boilerplate doesn't implementation creation yet */}
                    {/* <button className="btn btn-primary flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        新建数据库
                    </button> */}
                </div>
            </div>

            <div className="flex gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="搜索数据库名称或UUID..."
                        className="input pl-10 w-full"
                    />
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <SkeletonCard count={6} />
                </div>
            ) : filteredDatabases.length === 0 ? (
                <div className="text-center py-12 bg-dark-800/50 rounded-lg border border-dark-700">
                    <HardDrive className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-gray-300 mb-2">暂无数据库</h3>
                    <p className="text-gray-500">该账户下没有找到 D1 数据库</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDatabases.map((db) => (
                        <div key={db.uuid} className="card group hover:border-blue-500/50 transition-all">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 transition-colors">
                                        <Database className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-200">{db.name}</h3>
                                        <div className="text-xs text-gray-500 font-mono mt-0.5" title={db.uuid}>
                                            {db.uuid.substring(0, 8)}...{db.uuid.substring(db.uuid.length - 4)}
                                        </div>
                                    </div>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-xs border ${db.version === 'beta'
                                        ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                        : 'bg-green-500/10 text-green-400 border-green-500/20'
                                    }`}>
                                    {db.version || 'Beta'}
                                </span>
                            </div>

                            <div className="space-y-2 mb-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">创建时间</span>
                                    <span className="text-gray-300">
                                        {new Date(db.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">文件大小</span>
                                    <span className="text-gray-300">
                                        {/* D1 API might return file_size or similar */}
                                        {db.file_size ? (db.file_size / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown'}
                                    </span>
                                </div>
                            </div>

                            <div className="border-t border-dark-700 pt-4 flex justify-between items-center text-xs text-gray-500">
                                <span>Copy UUID to clipboard</span>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(db.uuid);
                                        toast.success('UUID已复制');
                                    }}
                                    className="hover:text-blue-400 transition-colors"
                                >
                                    Copy UUID
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default D1Panel;
