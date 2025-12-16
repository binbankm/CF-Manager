import React, { useState, useEffect, Suspense, lazy } from 'react';
import { LogOut, Cloud, Plus, Server, Database, Globe, FileCode, Settings, HardDrive } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { accountAPI } from '../services/api';
import AccountManager from '../components/AccountManager';

// 懒加载Panel组件以提升性能
const WorkersPanel = lazy(() => import('../components/WorkersPanel'));
const KVPanel = lazy(() => import('../components/KVPanel'));
const DNSPanel = lazy(() => import('../components/DNSPanel'));
const PagesPanel = lazy(() => import('../components/PagesPanel'));
const D1Panel = lazy(() => import('../components/D1Panel'));

// 加载中组件
const PanelLoader = () => (
    <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        <span className="ml-3 text-gray-400">加载中...</span>
    </div>
);

function Dashboard() {
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);
    const [accounts, setAccounts] = useState([]);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [activeTab, setActiveTab] = useState('workers');
    const [showAccountManager, setShowAccountManager] = useState(false);

    // 加载账号列表
    useEffect(() => {
        loadAccounts();
    }, []);

    const loadAccounts = async () => {
        try {
            const response = await accountAPI.getAccounts();
            if (response.data.success) {
                setAccounts(response.data.data.accounts);
                if (response.data.data.accounts.length > 0 && !selectedAccount) {
                    setSelectedAccount(response.data.data.accounts[0]);
                }
            }
        } catch (error) {
            console.error('加载账号失败:', error);
        }
    };

    const handleLogout = () => {
        logout();
        toast.success('已退出登录');
    };

    const tabs = [
        { id: 'workers', name: 'Workers', icon: Server },
        { id: 'kv', name: 'KV存储', icon: Database },
        { id: 'd1', name: 'D1数据库', icon: HardDrive },
        { id: 'dns', name: 'DNS管理', icon: Globe },
        { id: 'pages', name: 'Pages', icon: FileCode }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950">
            {/* 顶部导航栏 */}
            <nav className="bg-dark-900/80 backdrop-blur-lg border-b border-dark-800 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        {/* Logo */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center shadow-lg">
                                <Cloud className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold gradient-text">CF Manager</h1>
                                <p className="text-xs text-gray-500">资源管理平台</p>
                            </div>
                        </div>

                        {/* 用户信息 */}
                        <div className="flex items-center gap-4">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-medium text-gray-300">{user?.username}</p>
                                <p className="text-xs text-gray-500">{user?.email}</p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="btn btn-secondary"
                            >
                                <LogOut className="w-4 h-4" />
                                退出
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* 账号选择器 */}
                <div className="card mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
                            <Settings className="w-5 h-5 text-primary-400" />
                            Cloudflare账号
                        </h2>
                        <button
                            onClick={() => setShowAccountManager(true)}
                            className="btn btn-primary"
                        >
                            <Plus className="w-4 h-4" />
                            添加账号
                        </button>
                    </div>

                    {accounts.length === 0 ? (
                        <div className="text-center py-8">
                            <Cloud className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-400 mb-4">还没有添加Cloudflare账号</p>
                            <button
                                onClick={() => setShowAccountManager(true)}
                                className="btn btn-primary"
                            >
                                <Plus className="w-4 h-4" />
                                添加第一个账号
                            </button>
                        </div>
                    ) : (
                        <div className="flex gap-3 overflow-x-auto scrollbar-thin pb-2">
                            {accounts.map((account) => (
                                <button
                                    key={account.id}
                                    onClick={() => setSelectedAccount(account)}
                                    className={`px-4 py-3 rounded-lg border-2 transition-all duration-200 flex-shrink-0 ${selectedAccount?.id === account.id
                                        ? 'border-primary-500 bg-primary-500/10 text-white'
                                        : 'border-dark-700 bg-dark-800/50 text-gray-400 hover:border-dark-600 hover:text-gray-300'
                                        }`}
                                >
                                    <div className="font-medium">{account.account_name}</div>
                                    <div className="text-xs opacity-75 mt-1">{account.account_id}</div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* 功能标签页 */}
                {selectedAccount && (
                    <>
                        <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-thin">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 flex-shrink-0 ${activeTab === tab.id
                                            ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg'
                                            : 'bg-dark-800/50 text-gray-400 hover:bg-dark-800 hover:text-gray-300'
                                            }`}
                                    >
                                        <Icon className="w-5 h-5" />
                                        {tab.name}
                                    </button>
                                );
                            })}
                        </div>

                        {/* 内容面板 - 使用Suspense和条件渲染优化性能 */}
                        <div className="animate-fade-in">
                            <Suspense fallback={<PanelLoader />}>
                                {activeTab === 'workers' && <WorkersPanel accountId={selectedAccount.id} />}
                                {activeTab === 'kv' && <KVPanel accountId={selectedAccount.id} />}
                                {activeTab === 'd1' && <D1Panel accountId={selectedAccount.id} />}
                                {activeTab === 'dns' && <DNSPanel accountId={selectedAccount.id} />}
                                {activeTab === 'pages' && <PagesPanel accountId={selectedAccount.id} />}
                            </Suspense>
                        </div>
                    </>
                )}
            </div>

            {/* 账号管理器模态框 */}
            {showAccountManager && (
                <AccountManager
                    onClose={() => {
                        setShowAccountManager(false);
                        loadAccounts();
                    }}
                />
            )}
        </div>
    );
}

export default Dashboard;
