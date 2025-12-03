
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateTimeline, type TimelineResponse } from '../../api/timeline';
import { useTimelineStore, type Segment } from '../../stores/timelineStore';
import { fetchJobs, getJob, type Job } from '../../api/jobs';
import { Loader2, Sparkles, History } from 'lucide-react';

export default function TimelineGenerator() {
    const navigate = useNavigate();
    const [topic, setTopic] = useState('');
    const [style, setStyle] = useState('Cinematic');
    const [duration, setDuration] = useState<'short' | 'medium' | 'long'>('medium');
    const [isLoading, setIsLoading] = useState(false);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [activeJobId, setActiveJobId] = useState<string | null>(null);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const setSegments = useTimelineStore((state) => state.setSegments);
    const setIsPlaying = useTimelineStore((state) => state.setIsPlaying);
    const setCurrentTime = useTimelineStore((state) => state.setCurrentTime);

    useEffect(() => {
        loadHistory();
    }, []);

    useEffect(() => {
        if (!activeJobId) return;

        const interval = setInterval(async () => {
            try {
                const job = await getJob(activeJobId);

                // Update in history list
                setJobs(prev => {
                    const exists = prev.find(j => j.id === job.id);
                    if (exists) {
                        return prev.map(j => j.id === job.id ? job : j);
                    }
                    return [job, ...prev];
                });

                if (job.status === 'COMPLETED') {
                    setActiveJobId(null);
                    setIsLoading(false);
                    handleLoadJob(job);
                } else if (job.status === 'FAILED') {
                    setActiveJobId(null);
                    setIsLoading(false);
                    alert(`Generation failed: ${job.error || 'Unknown error'}`);
                }
            } catch (error) {
                console.error('Polling error:', error);
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [activeJobId]);

    const loadHistory = async () => {
        setIsLoadingHistory(true);
        try {
            const response = await fetchJobs('CYRAN_ROLL');
            // Handle both array and object response formats
            const history = Array.isArray(response) ? response : (response as { jobs: Job[] }).jobs || [];

            // Sort by createdAt desc
            const sorted = history.sort((a: Job, b: Job) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setJobs(sorted);
        } catch (error) {
            console.error('Failed to load history:', error);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const handleLoadJob = (job: Job) => {
        if (job.status !== 'COMPLETED' || !job.metadata?.response) {
            alert('This job is not completed or has no data.');
            return;
        }

        const response = job.metadata.response as TimelineResponse;
        if (!response.segments) return;

        const segmentsWithIds = response.segments.map((s: Segment, i: number) => ({
            ...s,
            id: s.id || `segment-${i}-${Date.now()}`,
            voiceUrl: s.voiceUrl
        }));

        setSegments(segmentsWithIds);

        // Global audioUrl is not supported in the current store structure for multi-segment audio
        // We rely on segment-level audioUrl

        setIsPlaying(false);
        setCurrentTime(0);
        navigate('/app/cyran-roll/editor');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!topic.trim()) return;

        setIsLoading(true);
        try {
            const job = await generateTimeline(topic, style, duration);
            setJobs(prev => [job, ...prev]);
            setActiveJobId(job.id);
        } catch (error) {
            console.error('Failed to generate timeline:', error);
            alert('Failed to generate timeline. Please try again.');
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto p-6 pt-32 min-h-[60vh] flex flex-col gap-12">
            <div className="flex flex-col justify-center">
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-raleway font-bold text-theme-text mb-4">
                        Create your Cyran Roll
                    </h1>
                    <p className="text-theme-white/70 font-raleway text-lg">
                        Turn your ideas into a cinematic video timeline with AI.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 bg-theme-black/20 p-8 rounded-3xl border border-theme-dark backdrop-blur-sm">
                    <div className="space-y-2">
                        <label htmlFor="topic" className="block text-sm font-medium text-theme-white font-raleway ml-1">
                            What video do you want to make?
                        </label>
                        <textarea
                            id="topic"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="e.g. A futuristic documentary about the history of coffee..."
                            className="w-full h-32 bg-theme-black/40 border border-theme-dark rounded-xl p-4 text-theme-text font-raleway text-base resize-none focus:outline-none focus:border-theme-mid focus:ring-1 focus:ring-theme-mid transition-all placeholder:text-theme-white/30"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="style" className="block text-sm font-medium text-theme-white font-raleway ml-1">
                                Style
                            </label>
                            <select
                                id="style"
                                value={style}
                                onChange={(e) => setStyle(e.target.value)}
                                className="w-full bg-theme-black/40 border border-theme-dark rounded-xl p-3 text-theme-text font-raleway text-sm focus:outline-none focus:border-theme-mid focus:ring-1 focus:ring-theme-mid transition-all appearance-none cursor-pointer"
                            >
                                <option value="Cinematic">Cinematic</option>
                                <option value="Documentary">Documentary</option>
                                <option value="Vlog">Vlog</option>
                                <option value="Educational">Educational</option>
                                <option value="Music Video">Music Video</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="duration" className="block text-sm font-medium text-theme-white font-raleway ml-1">
                                Duration
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {(['short', 'medium', 'long'] as const).map((d) => (
                                    <button
                                        key={d}
                                        type="button"
                                        onClick={() => setDuration(d)}
                                        className={`p-2 rounded-xl border font-raleway text-xs transition-all flex flex-col items-center justify-center gap-0.5 ${duration === d
                                            ? 'bg-theme-mid/20 border-theme-mid text-theme-mid shadow-[0_0_10px_rgba(0,255,255,0.1)]'
                                            : 'bg-theme-black/40 border-theme-dark text-theme-text/60 hover:border-theme-white/30 hover:text-theme-text'
                                            }`}
                                    >
                                        <span className="capitalize font-bold">{d}</span>
                                        <span className="text-[10px] opacity-60">
                                            {d === 'short' ? '~15s' : d === 'medium' ? '~30s' : '~60s'}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || !topic.trim()}
                        className="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-bold font-raleway text-lg shadow-lg hover:shadow-cyan-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-5 h-5" />
                                Generate Timeline
                            </>
                        )}
                    </button>
                </form>
            </div>

            <div className="w-full">
                <div className="flex items-center gap-2 mb-4 text-theme-text/80 px-2">
                    <History className="w-4 h-4" />
                    <h2 className="text-sm font-bold font-raleway uppercase tracking-wider">History</h2>
                </div>

                {isLoadingHistory ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-theme-white/40" />
                    </div>
                ) : jobs.length === 0 ? (
                    <div className="text-center text-theme-white/40 py-8 font-raleway text-sm">
                        No history yet.
                    </div>
                ) : (
                    <div className="space-y-1">
                        {jobs.map((job) => (
                            <button
                                key={job.id}
                                onClick={() => handleLoadJob(job)}
                                disabled={job.status !== 'COMPLETED'}
                                className={`w-full text-left px-4 py-3 rounded-lg transition-all group flex items-center justify-between ${job.status === 'COMPLETED'
                                    ? 'hover:bg-theme-white/5 cursor-pointer text-theme-text/80 hover:text-theme-text'
                                    : 'opacity-50 cursor-not-allowed text-theme-text/50'
                                    }`}
                            >
                                <span className="font-raleway text-sm truncate pr-4">
                                    {(job.metadata?.topic as string) || (job.metadata?.prompt as string) || 'Untitled Project'}
                                </span>
                                <span className="text-xs text-theme-white/30 font-mono whitespace-nowrap group-hover:text-theme-white/50 transition-colors">
                                    {new Date(job.createdAt).toLocaleDateString()}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
