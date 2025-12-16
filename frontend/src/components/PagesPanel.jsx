import React, { useState, useEffect, useMemo } from 'react';
import { FileCode, Clock, CheckCircle, XCircle, ExternalLink, Search } from 'lucide-react';
import { pagesAPI } from '../services/api';
import { SkeletonCard, SkeletonListItem } from './SkeletonLoader';
import { useDebounce } from '../hooks/useDebounce';

const PagesPanel = ({ accountId }) => {
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [deployments, setDeployments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadProjects();
    }, [accountId]);

    useEffect(() => {
        if (selectedProject) {
            loadDeployments();
        }
    }, [selectedProject]);

    const loadProjects = async () => {
        try {
            setLoading(true);
            const response = await pagesAPI.getProjects(accountId);
            if (response.data.success && response.data.data) {
                setProjects(response.data.data.result || []);
            }
        } catch (error) {
            console.error('加载项目失败:', error);
            setProjects([]);
        } finally {
            setLoading(false);
        }
    };

    const loadDeployments = async () => {
        try {
            const response = await pagesAPI.getDeployments(accountId, selectedProject.name);
            if (response.data.success && response.data.data) {
                setDeployments(response.data.data.result || []);
            }
        } catch (error) {
            console.error('加载部署历史失败:', error);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('zh-CN');
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'success':
                return 'text-green-400';
            case 'failure':
                return 'text-red-400';
            case 'active':
                return 'text-blue-400';
            default:
                return 'text-gray-400';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'success':
                return <CheckCircle className="w-5 h-5" />;
            case 'failure':
                return <XCircle className="w-5 h-5" />;
            default:
                return <Clock className="w-5 h-5" />;
        }
    };

    // 使用防抖优化搜索性能
    const debouncedSearchQuery = useDebounce(searchQuery, 300);

    // 使用useMemo缓存过滤项目
    const filteredProjects = useMemo(() => {
        if (!debouncedSearchQuery) return projects;

        const query = debouncedSearchQuery.toLowerCase();
        return projects.filter(project =>
            project.name.toLowerCase().includes(query)
        );
    }, [projects, debouncedSearchQuery]);

    if (loading) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="card">
                    <h3 className="text-lg font-semibold text-gray-200 mb-4">Pages项目</h3>
                    <div className="space-y-2"><SkeletonCard count={4} /></div>
                </div>
                <div className="lg:col-span-2 card">
                    <h3 className="text-lg font-semibold text-gray-200 mb-4">部署历史</h3>
                    <div className="space-y-3"><SkeletonListItem count={3} /></div>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 项目列表 */}
            <div className="card">
                <h3 className="text-lg font-semibold text-gray-200 mb-4">Pages项目</h3>

                {/* 搜索框 */}
                <div className="mb-4 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="搜索项目..."
                        className="input pl-10"
                    />
                </div>

                <div className="space-y-2 max-h-[600px] overflow-y-auto scrollbar-thin">
                    {filteredProjects.length === 0 ? (
                        <div className="text-center py-8">
                            {searchQuery ? (
                                <p className="text-gray-500">未找到匹配的项目</p>
                            ) : (
                                <>
                                    <FileCode className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                                    <p className="text-gray-500">暂无Pages项目</p>
                                </>
                            )}
                        </div>
                    ) : (
                        filteredProjects.map((project) => (
                            <div
                                key={project.id}
                                className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedProject?.name === project.name
                                    ? 'border-primary-500 bg-primary-500/10'
                                    : 'border-dark-700 bg-dark-800/50 hover:border-dark-600'
                                    }`}
                                onClick={() => setSelectedProject(project)}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <FileCode className="w-4 h-4 text-primary-400" />
                                    <span className="font-medium text-gray-200">{project.name}</span>
                                </div>
                                {project.domains && project.domains.length > 0 && (
                                    <a
                                        href={`https://${project.domains[0]}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
                                    >
                                        {project.domains[0]}
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* 部署历史 */}
            <div className="lg:col-span-2 card">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-200">
                        {selectedProject ? `部署历史: ${selectedProject.name}` : '请选择项目'}
                    </h3>
                </div>

                {selectedProject && (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto scrollbar-thin">
                        {deployments.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">暂无部署记录</p>
                        ) : (
                            deployments.map((deployment) => (
                                <div
                                    key={deployment.id}
                                    className="p-4 rounded-lg border border-dark-700 bg-dark-800/50 hover:border-dark-600 transition-all"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={getStatusColor(deployment.latest_stage?.status)}>
                                                {getStatusIcon(deployment.latest_stage?.status)}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-gray-200">
                                                        {deployment.deployment_trigger?.metadata?.branch || 'main'}
                                                    </span>
                                                    <span className="px-2 py-0.5 bg-dark-700 text-gray-400 rounded text-xs">
                                                        {deployment.deployment_trigger?.type || 'manual'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {formatDate(deployment.created_on)}
                                                </p>
                                            </div>
                                        </div>

                                        {deployment.url && (
                                            <a
                                                href={deployment.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn btn-secondary text-sm"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                                访问
                                            </a>
                                        )}
                                    </div>

                                    {deployment.deployment_trigger?.metadata?.commit_message && (
                                        <div className="mt-2 p-2 bg-dark-900/50 rounded border border-700">
                                            <p className="text-sm text-gray-400 line-clamp-2">
                                                {deployment.deployment_trigger.metadata.commit_message}
                                            </p>
                                        </div>
                                    )}

                                    {deployment.deployment_trigger?.metadata?.commit_hash && (
                                        <div className="mt-2 text-xs font-mono text-gray-500">
                                            Commit: {deployment.deployment_trigger.metadata.commit_hash.substring(0, 7)}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default React.memo(PagesPanel);
