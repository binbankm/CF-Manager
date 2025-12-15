import React, { useState } from 'react';
import { LogIn, UserPlus, Cloud } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';

function Login() {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: ''
    });

    const login = useAuthStore((state) => state.login);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isLogin) {
                // 登录
                const response = await authAPI.login({
                    username: formData.username,
                    password: formData.password
                });

                if (response.data.success) {
                    login(response.data.data.token, response.data.data.user);
                    toast.success('登录成功！');
                }
            } else {
                // 注册
                const response = await authAPI.register(formData);

                if (response.data.success) {
                    login(response.data.data.token, response.data.data.user);
                    toast.success('注册成功！');
                }
            }
        } catch (error) {
            console.error('认证失败:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-dark-950 via-primary-950/20 to-dark-950">
            {/* 背景装饰 */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* Logo和标题 */}
                <div className="text-center mb-8 animate-slide-down">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl mb-4 shadow-2xl">
                        <Cloud className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold gradient-text mb-2">
                        Cloudflare Manager
                    </h1>
                    <p className="text-gray-400">
                        强大的Cloudflare资源管理平台
                    </p>
                </div>

                {/* 登录/注册表单 */}
                <div className="card glass animate-slide-up">
                    {/* 切换按钮 */}
                    <div className="flex gap-2 mb-6 p-1 bg-dark-800/50 rounded-lg">
                        <button
                            onClick={() => setIsLogin(true)}
                            className={`flex-1 px-4 py-2 rounded-md transition-all duration-200 ${isLogin
                                    ? 'bg-primary-600 text-white shadow-lg'
                                    : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            <LogIn className="w-4 h-4 inline mr-2" />
                            登录
                        </button>
                        <button
                            onClick={() => setIsLogin(false)}
                            className={`flex-1 px-4 py-2 rounded-md transition-all duration-200 ${!isLogin
                                    ? 'bg-primary-600 text-white shadow-lg'
                                    : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            <UserPlus className="w-4 h-4 inline mr-2" />
                            注册
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* 用户名 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                用户名
                            </label>
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                required
                                className="input"
                                placeholder="请输入用户名"
                            />
                        </div>

                        {/* 邮箱（仅注册） */}
                        {!isLogin && (
                            <div className="animate-slide-down">
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    邮箱
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    className="input"
                                    placeholder="请输入邮箱"
                                />
                            </div>
                        )}

                        {/* 密码 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                密码
                            </label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                minLength={6}
                                className="input"
                                placeholder="请输入密码（至少6位）"
                            />
                        </div>

                        {/* 提交按钮 */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary w-full"
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    处理中...
                                </div>
                            ) : (
                                <>
                                    {isLogin ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                                    {isLogin ? '登录' : '注册'}
                                </>
                            )}
                        </button>
                    </form>

                    {/* 提示文本 */}
                    <p className="text-center text-sm text-gray-400 mt-6">
                        {isLogin ? '还没有账号？' : '已有账号？'}
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-primary-400 hover:text-primary-300 ml-1 font-medium"
                        >
                            {isLogin ? '立即注册' : '立即登录'}
                        </button>
                    </p>
                </div>

                {/* 底部提示 */}
                <div className="text-center mt-8 text-sm text-gray-500">
                    <p>使用此平台即表示您同意我们的服务条款</p>
                </div>
            </div>
        </div>
    );
}

export default Login;
