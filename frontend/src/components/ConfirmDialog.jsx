import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

/**
 * 确认对话框组件
 * 用于替代原生的window.confirm
 */
function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = '确认', cancelText = '取消', type = 'danger' }) {
    if (!isOpen) return null;

    const typeColors = {
        danger: 'from-red-600 to-red-500',
        warning: 'from-yellow-600 to-yellow-500',
        info: 'from-blue-600 to-blue-500'
    };

    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="card glass max-w-md w-full animate-slideIn">
                {/* 标题 */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-gradient-to-r ${typeColors[type]}`}>
                            <AlertTriangle className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-100">{title}</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-300 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* 内容 */}
                <p className="text-gray-300 mb-6 leading-relaxed">{message}</p>

                {/* 按钮组 */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="btn btn-secondary flex-1"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={handleConfirm}
                        className={`btn flex-1 bg-gradient-to-r ${typeColors[type]} text-white hover:opacity-90`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ConfirmDialog;
