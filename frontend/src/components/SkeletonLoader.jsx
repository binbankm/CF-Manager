import React from 'react';

// 骨架屏卡片
export function SkeletonCard({ count = 1 }) {
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="p-3 rounded-lg border border-dark-700 bg-dark-800/50 animate-pulse">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-4 h-4 bg-dark-600 rounded"></div>
                        <div className="h-4 bg-dark-600 rounded w-32"></div>
                    </div>
                    <div className="h-3 bg-dark-700 rounded w-48"></div>
                </div>
            ))}
        </>
    );
}

// 骨架屏表格行
export function SkeletonTableRow({ columns = 6, rows = 3 }) {
    return (
        <>
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <tr key={rowIndex} className="border-b border-dark-800 animate-pulse">
                    {Array.from({ length: columns }).map((_, colIndex) => (
                        <td key={colIndex} className="py-3 px-4">
                            <div className={`h-4 bg-dark-600 rounded ${colIndex === 0 ? 'w-16' : 'w-24'}`}></div>
                        </td>
                    ))}
                </tr>
            ))}
        </>
    );
}

// 骨架屏列表项
export function SkeletonListItem({ count = 3 }) {
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="p-4 rounded-lg border border-dark-700 bg-dark-800/50 animate-pulse">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-5 h-5 bg-dark-600 rounded"></div>
                            <div>
                                <div className="h-4 bg-dark-600 rounded w-24 mb-2"></div>
                                <div className="h-3 bg-dark-700 rounded w-32"></div>
                            </div>
                        </div>
                        <div className="w-16 h-8 bg-dark-600 rounded"></div>
                    </div>
                </div>
            ))}
        </>
    );
}

// 骨架屏加载器（通用）
export function SkeletonLoader({ type = 'card', count = 3, columns = 6, rows = 3 }) {
    switch (type) {
        case 'card':
            return <SkeletonCard count={count} />;
        case 'table':
            return <SkeletonTableRow columns={columns} rows={rows} />;
        case 'list':
            return <SkeletonListItem count={count} />;
        default:
            return <SkeletonCard count={count} />;
    }
}

export default SkeletonLoader;
