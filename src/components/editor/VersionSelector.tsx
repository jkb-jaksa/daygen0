import { useState } from 'react';
import { History, Check, Calendar } from 'lucide-react';
import { useTimelineStore } from '../../stores/timelineStore';
import type { JobVersion } from '../../api/jobs';

export const VersionSelector = () => {
    const { versions, restoreVersion, finalVideoUrl } = useTimelineStore();
    const [isOpen, setIsOpen] = useState(false);

    if (!versions || versions.length === 0) {
        return null; // Don't show if no history
    }

    const handleRestore = (version: JobVersion) => {
        restoreVersion(version);
        setIsOpen(false);
    };

    // Helper to format date
    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return dateString;
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 p-2 rounded-full hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white"
                title="Version History"
            >
                <History size={20} />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute bottom-full mb-2 right-0 origin-bottom-right w-64 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl overflow-hidden z-50 flex flex-col">
                        <div className="p-3 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
                            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                <History size={14} className="text-cyan-500" />
                                Version History
                            </h3>
                        </div>

                        <div className="max-h-60 overflow-y-auto py-1">
                            {versions.map((version) => {
                                const isCurrent = version.resultUrl === finalVideoUrl;
                                return (
                                    <button
                                        key={version.id}
                                        onClick={() => handleRestore(version)}
                                        className={`w-full text-left px-4 py-3 hover:bg-zinc-800 transition-colors flex items-center gap-3 group
                                            ${isCurrent ? 'bg-zinc-800/50' : ''}`}
                                    >
                                        <div className={`w-2 h-2 rounded-full shrink-0 ${isCurrent ? 'bg-cyan-500' : 'bg-zinc-600 group-hover:bg-zinc-500'}`} />

                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs text-zinc-500 flex items-center gap-1 mb-0.5">
                                                <Calendar size={10} />
                                                {formatDate(version.createdAt)}
                                            </div>
                                            <div className={`text-sm truncate ${isCurrent ? 'text-white font-medium' : 'text-zinc-300'}`}>
                                                Version {version.id.slice(0, 4)}...
                                            </div>
                                        </div>

                                        {isCurrent && <Check size={14} className="text-cyan-500 shrink-0" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
