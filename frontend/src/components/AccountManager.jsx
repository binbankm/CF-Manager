import React, { useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { accountAPI } from '../services/api';

function AccountManager({ onClose }) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        accountName: '',
        apiToken: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await accountAPI.addAccount(formData);

            if (response.data.success) {
                toast.success('账号添加成功！');
                onClose();
            }
        } catch (error) {
            console.error('添加账号失败:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="card glass max-w-lg w-full animate-slide-up" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold gradient-text">添加Cloudflare账号</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            账号名称
                        </label>
                        <input
                            type="text"
                            value={formData.accountName}
                            onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                            required
                            className="input"
                            placeholder="例如：我的主账号"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            API Token
                        </label>
                        <textarea
                            value={formData.apiToken}
                            onChange={(e) => setFormData({ ...formData, apiToken: e.target.value })}
                            required
                            rows={4}
                            className="input font-mono text-sm"
                            placeholder="粘贴您的Cloudflare API Token"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                            需要具有Workers、KV、DNS和Pages权限的Token
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button type="submit" disabled={loading} className="btn btn-primary flex-1">
                            {loading ? '验证中...' : '添加账号'}
                        </button>
                        <button type="button" onClick={onClose} className="btn btn-secondary">
                            取消
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AccountManager;
