import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateTimeline, type TimelineResponse } from '../../api/timeline';
import { useTimelineStore, type Segment } from '../../stores/timelineStore';
import { fetchJobs, type Job } from '../../api/jobs';
import { Loader2, Sparkles, History, Volume2, VolumeX, Upload, X, Captions, CaptionsOff } from 'lucide-react';
import { uploadToR2 } from '../../utils/uploadToR2';
import { VoiceSelector } from '../shared/VoiceSelector';

export default function TimelineGenerator() {
    const navigate = useNavigate();
    const [topic, setTopic] = useState('');
    const [style, setStyle] = useState('Cinematic');
    const [duration, setDuration] = useState<'short' | 'medium' | 'long'>('medium');
    const [musicVolume, setMusicVolume] = useState(30); // 0-100%
    const [isLoading, setIsLoading] = useState(false);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const setSegments = useTimelineStore((state) => state.setSegments);
    const setMusicUrl = useTimelineStore((state) => state.setMusicUrl);
    const setFinalVideoUrl = useTimelineStore((state) => state.setFinalVideoUrl);
    const setIsPlaying = useTimelineStore((state) => state.setIsPlaying);
    const setCurrentTime = useTimelineStore((state) => state.setCurrentTime);
    const setJobId = useTimelineStore((state) => state.setJobId);
    const setJobDuration = useTimelineStore((state) => state.setJobDuration);
    const setMusicVolumeStore = useTimelineStore((state) => state.setMusicVolume);

    const [referenceImages, setReferenceImages] = useState<string[]>([]);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [selectedVoiceId, setSelectedVoiceId] = useState<string>('');
    const [includeVoiceover, setIncludeVoiceover] = useState(true);
    const [includeSubtitles, setIncludeSubtitles] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isDragging, setIsDragging] = useState(false);
    const [hoveredControl, setHoveredControl] = useState<'voiceover' | 'subtitles' | null>(null);

    useEffect(() => {
        loadHistory();
    }, []);

    const handleLoadJob = useCallback((job: Job) => {
        // Allow loading processing jobs
        if (job.status === 'PROCESSING' || job.status === 'STITCHING' || job.status === 'PENDING') {
            setJobId(job.id);
            setJobDuration(duration); // We might need to save duration in metadata to recover it correctly here
            // Navigate to editor to let it poll
            navigate('/app/cyran-roll/editor');
            return;
        }

        if (job.status !== 'COMPLETED' || !job.metadata?.response) {
            alert('This job failed or has no data.');
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
        setJobId(job.id);

        // Restore music volume if available, or default to 30
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const savedVolume = (job.metadata as any)?.dto?.musicVolume ?? 30;
        console.log("DEBUG: handleLoadJob - savedVolume:", savedVolume);
        setMusicVolumeStore(savedVolume);
        setMusicVolume(savedVolume); // Update local state too


        // Extract global musicUrl from response
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const musicUrl = (response as any).musicUrl || null;
        console.log("DEBUG: handleLoadJob - musicUrl:", musicUrl);
        setMusicUrl(musicUrl);
        setFinalVideoUrl(job.resultUrl || null);


        setIsPlaying(false);
        setCurrentTime(0);
        setCurrentTime(0);
        navigate('/app/cyran-roll/editor');
    }, [navigate, setSegments, setIsPlaying, setCurrentTime, setJobId, setMusicUrl, setMusicVolumeStore, setFinalVideoUrl, duration, setJobDuration]);

    // Local polling removed - responsibility moved to Editor
    useEffect(() => {
        // No-op or removed
    }, []);

    const loadHistory = async () => {
        setIsLoadingHistory(true);
        try {
            const response = await fetchJobs('CYRAN_ROLL');
            // Handle both array and object response formats
            const history = Array.isArray(response) ? response : (response as { jobs: Job[] }).jobs || [];

            // Filter out failed jobs and Sort by createdAt desc
            const sorted = history
                .filter((j: Job) => j.status !== 'FAILED')
                .sort((a: Job, b: Job) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            setJobs(sorted);

            // Check for any active job to update status but DO NOT redirect automatically
            const activeJob = sorted.find(j => j.status === 'PROCESSING' || j.status === 'STITCHING' || j.status === 'PENDING');
            if (activeJob) {
                // Just let the history list show the status
                console.log("Found active job:", activeJob.id);
            }

        } catch (error) {
            console.error('Failed to load history:', error);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const processFiles = async (files: File[]) => {
        if (!files.length) return;
        setIsUploadingImage(true);
        try {
            const uploadPromises = files.map(async (file) => {
                try {
                    const result = await uploadToR2(file, file.name, file.type, 'temp/cyran-roll-images');
                    if (result.success && result.publicUrl) {
                        return result.publicUrl;
                    }
                    throw new Error(result.error || 'Upload failed');
                } catch (err) {
                    console.error(`Failed to upload file ${file.name}:`, err);
                    throw err; // Re-throw to be caught by Promise.all
                }
            });

            const results = await Promise.all(uploadPromises);
            setReferenceImages(prev => [...prev, ...results]);
        } catch (error) {
            console.error('Failed to upload one or more images:', error);
            alert(`Failed to upload images: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsUploadingImage(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        await processFiles(Array.from(e.target.files));
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files?.length) {
            await processFiles(Array.from(e.dataTransfer.files));
        }
    };

    const removeImage = (index: number) => {
        setReferenceImages(prev => prev.filter((_, i) => i !== index));
    };



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!topic.trim()) return;

        setIsLoading(true);
        try {
            // Clear existing data before starting new job
            setSegments([]);
            setMusicUrl(null);
            setFinalVideoUrl(null);

            const job = await generateTimeline(topic, style, duration, musicVolume / 100, referenceImages, selectedVoiceId, includeVoiceover, includeSubtitles);

            // Set Job ID and navigate immediately
            setJobId(job.id);
            setJobDuration(duration); // Store duration for placeholders
            setMusicVolumeStore(musicVolume); // Store the requested volume

            navigate('/app/cyran-roll/editor');
        } catch (error) {
            console.error('Failed to generate timeline:', error);
            alert('Failed to generate timeline. Please try again.');
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto p-6 pt-32 min-h-[60vh] flex flex-col gap-12">
            <div className="flex flex-col justify-center">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-raleway font-bold text-theme-text mb-4">
                        Create your Cyran Roll
                    </h1>
                    <p className="text-theme-white/70 font-raleway text-lg">
                        Turn your ideas into a cinematic video timeline with AI.
                    </p>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className={`space-y-6 bg-theme-black/20 p-8 rounded-3xl border backdrop-blur-sm transition-all relative ${isDragging
                        ? 'border-theme-mid bg-theme-mid/5 ring-2 ring-theme-mid/20'
                        : 'border-theme-dark'
                        }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    {isDragging && (
                        <div className="absolute inset-0 bg-theme-mid/10 backdrop-blur-sm rounded-3xl flex items-center justify-center z-50 animate-in fade-in duration-200">
                            <div className="bg-theme-black/90 p-6 rounded-2xl border border-theme-mid/50 shadow-2xl flex flex-col items-center gap-3">
                                <Upload className="w-10 h-10 text-theme-mid animate-bounce" />
                                <p className="text-lg font-bold text-theme-mid font-raleway">Drop images here</p>
                            </div>
                        </div>
                    )}

                    {/* Topic Section - Standard Size */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label htmlFor="topic" className="text-sm font-medium text-theme-white font-raleway ml-1">
                                What video do you want to make?
                            </label>
                            <div className="flex items-center gap-2">
                                {/* Reference Images */}
                                {referenceImages.length > 0 && (
                                    <div className="flex items-center gap-1.5 mr-1">
                                        {referenceImages.map((url, i) => (
                                            <div key={i} className="relative w-8 h-8 rounded overflow-hidden group border border-theme-white/20">
                                                <img src={url} className="w-full h-full object-cover" alt={`Ref ${i}`} />
                                                <button
                                                    type="button"
                                                    onClick={() => removeImage(i)}
                                                    className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X size={10} className="text-white" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploadingImage}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-theme-white/5 hover:bg-theme-white/10 border border-theme-white/10 rounded-lg text-xs font-raleway text-theme-white/70 transition-all hover:text-theme-white disabled:opacity-50"
                                    >
                                        {isUploadingImage ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <Upload className="w-3.5 h-3.5" />
                                        )}
                                        {isUploadingImage ? '...' : 'Add Reference'}
                                    </button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleImageUpload}
                                        className="hidden"
                                        accept="image/*"
                                        multiple
                                    />
                                </div>
                            </div>
                        </div>

                        <textarea
                            id="topic"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="e.g. A futuristic documentary about the history of coffee..."
                            className="w-full h-28 bg-theme-black/40 border border-theme-dark rounded-xl p-4 text-theme-text font-raleway text-base resize-none focus:outline-none focus:border-theme-mid focus:ring-1 focus:ring-theme-mid transition-all placeholder:text-theme-white/30"
                            required
                        />
                    </div>

                    {/* Compact Controls Area */}
                    <div className="space-y-3 pt-2">
                        {/* Row 1: Style & Duration */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label htmlFor="style" className="block text-xs font-medium text-theme-white/80 font-raleway ml-1 uppercase tracking-wide">
                                    Style
                                </label>
                                <select
                                    id="style"
                                    value={style}
                                    onChange={(e) => setStyle(e.target.value)}
                                    className="w-full bg-theme-black/40 border border-theme-dark rounded-lg p-2 text-theme-text font-raleway text-xs focus:outline-none focus:border-theme-mid focus:ring-1 focus:ring-theme-mid transition-all appearance-none cursor-pointer hover:border-theme-white/20"
                                >
                                    <option value="Cinematic">Cinematic</option>
                                    <option value="Documentary">Documentary</option>
                                    <option value="Vlog">Vlog</option>
                                    <option value="Educational">Educational</option>
                                    <option value="Music Video">Music Video</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <span className="block text-xs font-medium text-theme-white/80 font-raleway ml-1 uppercase tracking-wide">
                                    Duration
                                </span>
                                <div className="grid grid-cols-3 gap-1.5">
                                    {(['short', 'medium', 'long'] as const).map((d) => (
                                        <button
                                            key={d}
                                            type="button"
                                            onClick={() => setDuration(d)}
                                            className={`py-1.5 px-1 rounded-lg border font-raleway transition-all flex flex-col items-center justify-center gap-0.5 ${duration === d
                                                ? 'bg-theme-mid/20 border-theme-mid text-theme-mid shadow-[0_0_8px_rgba(0,255,255,0.15)]'
                                                : 'bg-theme-black/40 border-theme-dark text-theme-white/50 hover:border-theme-white/30 hover:text-theme-white'
                                                }`}
                                        >
                                            <span className="capitalize font-bold text-[10px]">{d}</span>
                                            <span className="text-[8px] opacity-60 leading-none">
                                                {d === 'short' ? '~15s' : d === 'medium' ? '~30s' : '~60s'}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Row 2: Narrator & Volume */}
                        <div className="grid grid-cols-2 gap-3">
                            {/* Compact Narrator Voice */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-medium text-theme-white/80 font-raleway ml-1 uppercase tracking-wide">
                                    Narrator Voice
                                </label>
                                <VoiceSelector
                                    value={selectedVoiceId}
                                    onChange={setSelectedVoiceId}
                                    className="w-full bg-theme-black/40 border border-theme-dark rounded-lg p-2 text-theme-text font-raleway text-xs focus:outline-none focus:border-theme-mid focus:ring-1 focus:ring-theme-mid transition-all appearance-none cursor-pointer hover:border-theme-white/20"
                                />
                            </div>

                            {/* Compact Volume & Toggles */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-medium text-theme-white/80 font-raleway ml-1 uppercase tracking-wide h-4 transition-all duration-200">
                                    {hoveredControl === 'voiceover'
                                        ? `Voiceover: ${includeVoiceover ? 'On' : 'Off (Visual Only ~5s)'}`
                                        : hoveredControl === 'subtitles'
                                            ? `Subtitles: ${includeSubtitles ? 'On' : 'Off'}`
                                            : 'Audio Settings'}
                                </label>
                                <div className="flex items-center gap-2 bg-theme-black/40 border border-theme-dark rounded-xl p-2 h-[34px]">
                                    {/* Slim Volume Slider */}
                                    <div className="flex-1 flex items-center gap-2 ml-1">
                                        {musicVolume === 0 ? <VolumeX className="w-3.5 h-3.5 text-theme-white/60" /> : <Volume2 className="w-3.5 h-3.5 text-theme-white/60" />}
                                        <input
                                            id="volume"
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={musicVolume}
                                            onChange={(e) => setMusicVolume(parseInt(e.target.value))}
                                            className="flex-1 h-1 bg-theme-dark rounded-lg appearance-none cursor-pointer accent-theme-mid hover:accent-cyan-400 transition-all"
                                            title={`Music Volume: ${musicVolume}%`}
                                        />
                                        <span className="text-[10px] font-mono text-theme-white/60 w-8 text-right">{musicVolume}%</span>
                                    </div>

                                    <div className="w-px h-4 bg-theme-dark/50 mx-0.5" />

                                    {/* Compact Toggles with Tooltips */}
                                    <div className="flex gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setIncludeVoiceover(!includeVoiceover)}
                                            onMouseEnter={() => setHoveredControl('voiceover')}
                                            onMouseLeave={() => setHoveredControl(null)}
                                            className={`group relative flex flex-col items-center justify-center w-7 h-7 rounded-md border transition-all ${includeVoiceover
                                                ? 'bg-theme-mid/20 border-theme-mid text-theme-mid shadow-[0_0_10px_rgba(0,255,255,0.1)]'
                                                : 'bg-theme-black/40 border-theme-dark text-theme-white/40 hover:border-theme-white/30 hover:text-theme-white'
                                                }`}
                                        >
                                            {includeVoiceover ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setIncludeSubtitles(!includeSubtitles)}
                                            onMouseEnter={() => setHoveredControl('subtitles')}
                                            onMouseLeave={() => setHoveredControl(null)}
                                            className={`group relative flex flex-col items-center justify-center w-7 h-7 rounded-md border transition-all ${includeSubtitles
                                                ? 'bg-theme-mid/20 border-theme-mid text-theme-mid shadow-[0_0_10px_rgba(0,255,255,0.1)]'
                                                : 'bg-theme-black/40 border-theme-dark text-theme-white/40 hover:border-theme-white/30 hover:text-theme-white'
                                                }`}
                                        >
                                            {includeSubtitles ? <Captions className="w-3 h-3" /> : <CaptionsOff className="w-3 h-3" />}
                                        </button>
                                    </div>
                                </div>
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
                                {isLoading ? 'Processing...' : 'Generating...'}
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
                                disabled={job.status === 'FAILED'}
                                className={`w-full text-left px-4 py-3 rounded-lg transition-all group flex items-center justify-between ${job.status !== 'FAILED'
                                    ? 'hover:bg-theme-white/5 cursor-pointer text-theme-text/80 hover:text-theme-text'
                                    : 'opacity-80 cursor-not-allowed text-theme-text/60 bg-theme-white/5'
                                    }`}
                            >
                                <div className="flex flex-col gap-1 w-full mr-4">
                                    <span className="font-raleway text-sm truncate">
                                        {(job.metadata?.title as string) || (job.metadata?.topic as string) || (job.metadata?.prompt as string) || 'Untitled Project'}
                                    </span>
                                    {(job.status === 'PROCESSING' || job.status === 'STITCHING') && (
                                        <div className="w-full flex items-center gap-2">
                                            <div className="h-1 flex-1 bg-theme-white/10 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-theme-mid transition-all duration-500 ease-out"
                                                    style={{ width: `${job.progress || 0}%` }}
                                                />
                                            </div>
                                            <span className="text-[10px] font-mono text-theme-mid animate-pulse">
                                                {job.status === 'STITCHING' ? 'STITCHING...' : 'GENERATING...'}
                                            </span>
                                        </div>
                                    )}
                                </div>
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
