import React, { useState, useRef } from 'react';
import { Upload, Mic, Check, AlertCircle, Loader2, X, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createProfessionalVoice } from '../../utils/audioApi';
import { inputs, buttons, glass, text } from '../../styles/designSystem';

type VoiceUploaderProps = {
    onSuccess?: () => void;
    className?: string;
};

type Step = 'upload' | 'success';

export const VoiceUploader: React.FC<VoiceUploaderProps> = ({ onSuccess, className = '' }) => {
    const [step, setStep] = useState<Step>('upload');
    const [files, setFiles] = useState<File[]>([]);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
            setError(null);
        }
    };

    const handleUpload = async () => {
        // Allow either files or recording blob
        if (files.length === 0 && !recordingBlob) {
            setError('Please select at least one file or record audio.');
            return;
        }
        if (!name.trim()) {
            setError('Please provide a voice name.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // If we have a recording, convert it to a file
            const filesToUpload = files.length > 0
                ? files
                : [new File([recordingBlob!], `recording-${Date.now()}.webm`, { type: 'audio/webm' })];

            await createProfessionalVoice(filesToUpload, { name, description });
            // For IVC, voice is ready immediately - no verification needed
            setStep('success');
            if (onSuccess) onSuccess();
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'Failed to upload voice samples.');
        } finally {
            setIsLoading(false);
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                setRecordingBlob(blob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setError(null);
        } catch (err) {
            console.error(err);
            setError('Could not access microphone. Please ensure permissions are granted.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const clearRecording = () => {
        setRecordingBlob(null);
    };

    return (
        <div className={`${glass.surface} p-6 sm:p-8 ${className}`}>
            <h2 className={`${text.sectionHeading} mb-6`}>
                {step === 'upload' && 'Clone Voice'}
                {step === 'success' && 'Voice Created Successfully'}
            </h2>

            <AnimatePresence mode="wait">
                {step === 'upload' && (
                    <motion.div
                        key="upload"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                    >
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-200">
                            <p className="font-medium mb-1 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                Audio Requirements:
                            </p>
                            <p className="opacity-90 font-raleway">
                                Provide 1-3 minutes of clear, high-quality audio for best results.
                                Record directly or upload audio files.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-raleway font-medium text-theme-white/80 mb-2">Voice Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className={inputs.base}
                                    placeholder="e.g. My Voice Clone"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-raleway font-medium text-theme-white/80 mb-2">Description (Optional)</label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className={inputs.base}
                                    placeholder="e.g. Narrator style, calm and deep"
                                />
                            </div>

                            {/* Options Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Recording Option */}
                                <div className={`border border-theme-dark bg-theme-black/20 rounded-xl p-4 transition-colors ${isRecording ? 'border-red-500/50 bg-red-500/5' : ''}`}>
                                    <label className="block text-sm font-raleway font-medium text-theme-white/80 mb-3">Record Audio</label>
                                    <div className="flex flex-col items-center gap-3">
                                        {!isRecording && !recordingBlob && (
                                            <button
                                                onClick={startRecording}
                                                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all hover:scale-105 shadow-lg shadow-red-500/20"
                                            >
                                                <Mic className="w-8 h-8 text-white" />
                                            </button>
                                        )}
                                        {isRecording && (
                                            <button
                                                onClick={stopRecording}
                                                className="w-16 h-16 rounded-full bg-theme-white hover:bg-theme-white/90 flex items-center justify-center transition-all hover:scale-105 animate-pulse"
                                            >
                                                <Square className="w-6 h-6 text-red-500 fill-current" />
                                            </button>
                                        )}
                                        {recordingBlob && !isRecording && (
                                            <div className="flex flex-col items-center gap-3 w-full">
                                                <div className="flex items-center gap-2 bg-green-500/20 text-green-400 px-3 py-2 rounded-lg text-sm w-full justify-center">
                                                    <Check className="w-4 h-4" />
                                                    Recording ready
                                                </div>
                                                <button
                                                    onClick={clearRecording}
                                                    className="text-theme-white/60 hover:text-red-400 text-sm transition-colors flex items-center gap-1"
                                                >
                                                    <X className="w-3 h-3" />
                                                    Clear recording
                                                </button>
                                            </div>
                                        )}
                                        <span className="text-xs text-theme-white/60 font-raleway">
                                            {isRecording ? 'Recording... Click to stop' : recordingBlob ? '' : 'Click to record'}
                                        </span>
                                    </div>
                                </div>

                                {/* File Upload Option */}
                                <div className="border border-theme-dark bg-theme-black/20 rounded-xl p-4 flex flex-col">
                                    <label className="block text-sm font-raleway font-medium text-theme-white/80 mb-3">Upload Audio</label>
                                    <div className="relative flex-1">
                                        <input
                                            type="file"
                                            multiple
                                            accept="audio/*"
                                            onChange={handleFileChange}
                                            className="hidden"
                                            id="voice-files"
                                        />
                                        <label
                                            htmlFor="voice-files"
                                            className="cursor-pointer flex flex-col items-center justify-center gap-2 h-full py-4 border-2 border-dashed border-theme-white/10 rounded-lg hover:border-theme-white/30 hover:bg-theme-white/5 transition-all group"
                                        >
                                            <Upload className="w-6 h-6 text-theme-white/40 group-hover:text-theme-white/80 transition-colors" />
                                            <span className="text-xs text-theme-white/40 group-hover:text-theme-white/80 text-center px-4 font-raleway transition-colors">
                                                {files.length > 0
                                                    ? `${files.length} file(s) selected`
                                                    : 'Click to upload files'}
                                            </span>
                                        </label>
                                    </div>
                                    {files.length > 0 && (
                                        <div className="mt-3 space-y-1">
                                            {files.slice(0, 2).map((f, i) => (
                                                <div key={i} className="text-xs text-theme-white/60 flex items-center gap-1 truncate font-raleway">
                                                    <span className="w-1 h-1 bg-theme-white/60 rounded-full flex-shrink-0" />
                                                    <span className="truncate">{f.name}</span>
                                                </div>
                                            ))}
                                            {files.length > 2 && (
                                                <div className="text-xs text-theme-white/40 pl-2 font-raleway">
                                                    + {files.length - 2} more files
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="text-red-300 text-sm bg-red-500/10 p-3 rounded-xl border border-red-500/20 font-raleway">
                                {error}
                            </div>
                        )}

                        <button
                            onClick={handleUpload}
                            disabled={isLoading || (files.length === 0 && !recordingBlob) || !name.trim()}
                            className={`${buttons.primary} w-full justify-center mt-2`}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Creating Voice...
                                </>
                            ) : (
                                'Clone Voice'
                            )}
                        </button>
                    </motion.div>
                )}

                {step === 'success' && (
                    <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-8 space-y-6"
                    >
                        <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/30 shadow-[0_0_30px_-5px_rgba(34,197,94,0.3)]">
                            <Check className="w-10 h-10" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-raleway font-medium text-theme-text">Voice Clone Created</h3>
                            <p className="text-theme-white/60 font-raleway max-w-xs mx-auto text-sm leading-relaxed">
                                Your voice clone is ready to use! You can now select it from the voice dropdown.
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                setStep('upload');
                                setFiles([]);
                                setName('');
                                setDescription('');
                                setRecordingBlob(null);
                            }}
                            className={`${buttons.ghost} mx-auto`}
                        >
                            Clone Another Voice
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
