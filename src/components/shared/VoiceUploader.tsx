import React, { useState, useRef } from 'react';
import { Upload, Mic, Check, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createProfessionalVoice } from '../../utils/audioApi';
import { inputs, buttons } from '../../styles/designSystem';

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
        <div className={`bg-gray-900/50 border border-white/10 rounded-xl p-6 backdrop-blur-sm ${className}`}>
            <h2 className="text-xl font-semibold text-white mb-4">
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
                        className="space-y-4"
                    >
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-sm text-blue-200">
                            <p className="font-medium mb-1 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                Audio Requirements:
                            </p>
                            <p className="opacity-90">
                                Provide 1-3 minutes of clear, high-quality audio for best results.
                                Record directly or upload audio files.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Voice Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className={inputs.base}
                                    placeholder="e.g. My Voice Clone"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Description (Optional)</label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className={inputs.base}
                                    placeholder="e.g. Narrator style, calm and deep"
                                />
                            </div>

                            {/* Recording Option */}
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-2">Record Audio</label>
                                <div className="flex items-center gap-3">
                                    {!isRecording && !recordingBlob && (
                                        <button
                                            onClick={startRecording}
                                            className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors shadow-lg shadow-red-500/20"
                                        >
                                            <Mic className="w-6 h-6 text-white" />
                                        </button>
                                    )}
                                    {isRecording && (
                                        <button
                                            onClick={stopRecording}
                                            className="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors animate-pulse"
                                        >
                                            <div className="w-4 h-4 bg-red-500 rounded-sm" />
                                        </button>
                                    )}
                                    {recordingBlob && !isRecording && (
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-2 bg-green-500/20 text-green-400 px-3 py-2 rounded-lg text-sm">
                                                <Check className="w-4 h-4" />
                                                Recording ready
                                            </div>
                                            <button
                                                onClick={clearRecording}
                                                className="text-gray-400 hover:text-white text-sm"
                                            >
                                                Clear
                                            </button>
                                        </div>
                                    )}
                                    <span className="text-xs text-gray-500">
                                        {isRecording ? 'Recording... Click to stop' : recordingBlob ? '' : 'Click to record'}
                                    </span>
                                </div>
                            </div>

                            {/* File Upload Option */}
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Or Upload Audio Files</label>
                                <div className="relative">
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
                                        className={`${inputs.base} cursor-pointer flex items-center justify-center gap-2 py-6 border-dashed`}
                                    >
                                        <Upload className="w-5 h-5 text-gray-400" />
                                        <span className="text-gray-400">
                                            {files.length > 0
                                                ? `${files.length} file(s) selected`
                                                : 'Click to upload audio files'}
                                        </span>
                                    </label>
                                </div>
                                {files.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                        {files.slice(0, 3).map((f, i) => (
                                            <div key={i} className="text-xs text-gray-500 flex items-center gap-1">
                                                <span className="w-1 h-1 bg-gray-500 rounded-full" />
                                                {f.name}
                                            </div>
                                        ))}
                                        {files.length > 3 && (
                                            <div className="text-xs text-gray-500 pl-2">
                                                + {files.length - 3} more files
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {error && (
                            <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded border border-red-500/20">
                                {error}
                            </div>
                        )}

                        <button
                            onClick={handleUpload}
                            disabled={isLoading || (files.length === 0 && !recordingBlob) || !name.trim()}
                            className={`${buttons.primary} w-full justify-center`}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
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
                        className="text-center py-8 space-y-4"
                    >
                        <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Check className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-white">Voice Clone Created</h3>
                        <p className="text-gray-400 max-w-xs mx-auto">
                            Your voice clone is ready to use! You can now select it from the voice dropdown.
                        </p>
                        <button
                            onClick={() => {
                                setStep('upload');
                                setFiles([]);
                                setName('');
                                setDescription('');
                                setRecordingBlob(null);
                            }}
                            className={`${buttons.secondary} mt-4`}
                        >
                            Clone Another Voice
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
