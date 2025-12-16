import { useState, useEffect } from 'react';

/**
 * useDebounce Hook
 * 用于延迟更新值，避免频繁触发操作
 * 
 * @param {any} value - 需要防抖的值
 * @param {number} delay - 延迟时间（毫秒），默认300ms
 * @returns {any} 防抖后的值
 * 
 * @example
 * const [searchQuery, setSearchQuery] = useState('');
 * const debouncedQuery = useDebounce(searchQuery, 300);
 * 
 * // debouncedQuery 会在用户停止输入300ms后更新
 */
export function useDebounce(value, delay = 300) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        // 设置定时器
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        // 清理函数：在value变化或组件卸载时清除定时器
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}
