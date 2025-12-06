import React, { useState, useRef } from 'react';
import { Upload, Mic, Check, AlertCircle, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createProfessionalVoice, verifyProfessionalVoice } from '../../utils/audioApi';
import { inputs, buttons } from '../../styles/designSystem';

type VoiceUploaderProps = {
    onSuccess?: () => void;
    className?: string;
};

type Step = 'upload' | 'verify' | 'success';

export const VoiceUploader: React.FC<VoiceUploaderProps> = ({ onSuccess, className = '' }) => {
    const [step, setStep] = useState<Step>('upload');
    const [files, setFiles] = useState<File[]>([]);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [voiceId, setVoiceId] = useState<string | null>(null);
    const [verificationText, setVerificationText] = useState<string | null>(null);
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
        if (files.length === 0) {
            setError('Please select at least one file.');
            return;
        }
        if (!name.trim()) {
            setError('Please provide a voice name.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const result = await createProfessionalVoice(files, { name, description });
            setVoiceId(result.voiceId);
            // Assuming verification text is returned or we use a default/placeholder if API doesn't provide it immediately
            // The backend maps it from payload.verification_text
            setVerificationText(result.verification_text || "I verify that I have the rights to clone this voice.");
            setStep('verify');
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

    const handleVerificationSubmit = async () => {
        if (!recordingBlob || !voiceId) return;

        setIsLoading(true);
        setError(null);

        try {
            await verifyProfessionalVoice(recordingBlob, voiceId);
            setStep('success');
            if (onSuccess) onSuccess();
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'Verification failed.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`bg-gray-900/50 border border-white/10 rounded-xl p-6 backdrop-blur-sm ${className}`}>
            <h2 className="text-xl font-semibold text-white mb-4">
                {step === 'upload' && 'Create Professional Voice Clone'}
                {step === 'verify' && 'Verify Voice Ownership'}
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
                                For Sufficient Audio Strength:
                            </p>
                            <p className="opacity-90">
                                User should provide at least 30 minutes of high-quality audio... preferably closer to 3 hours.
                                If you plan to upload multiple hours, split it into multiple ~30-minute samples.
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
                                    placeholder="e.g. My Professional Voice"
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

                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Audio Samples</label>
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
                                        className={`${inputs.base} cursor-pointer flex items-center justify-center gap-2 py-8 border-dashed`}
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
                            disabled={isLoading || files.length === 0 || !name.trim()}
                            className={`${buttons.primary} w-full justify-center`}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    Uploading & Processing...
                                </>
                            ) : (
                                'Create Voice'
                            )}
                        </button>
                    </motion.div>
                )}

                {step === 'verify' && (
                    <motion.div
                        key="verify"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                    >
                        <div className="text-center space-y-4">
                            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                                <p className="text-sm text-gray-400 mb-2">Please read the following text aloud:</p>
                                <p className="text-lg text-white font-medium italic">
                                    "{verificationText}"
                                </p>
                            </div>

                            <div className="flex justify-center">
                                {!isRecording && !recordingBlob && (
                                    <button
                                        onClick={startRecording}
                                        className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors shadow-lg shadow-red-500/20"
                                    >
                                        <Mic className="w-8 h-8 text-white" />
                                    </button>
                                )}

                                {isRecording && (
                                    <button
                                        onClick={stopRecording}
                                        className="w-16 h-16 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors animate-pulse"
                                    >
                                        <div className="w-6 h-6 bg-red-500 rounded-sm" />
                                    </button>
                                )}

                                {!isRecording && recordingBlob && (
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => setRecordingBlob(null)}
                                            className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={handleVerificationSubmit}
                                            disabled={isLoading}
                                            className={`${buttons.primary} px-8`}
                                        >
                                            {isLoading ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <>
                                                    <Check className="w-5 h-5 mr-2" />
                                                    Submit Verification
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>

                            <p className="text-xs text-gray-500">
                                {isRecording ? 'Recording... Tap to stop' : recordingBlob ? 'Recording captured. Submit to verify.' : 'Tap the mic to start recording'}
                            </p>
                        </div>

                        {error && (
                            <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded border border-red-500/20 text-center">
                                {error}
                            </div>
                        )}
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
                        <h3 className="text-xl font-bold text-white">Voice Training Initiated</h3>
                        <p className="text-gray-400 max-w-xs mx-auto">
                            Your files have been saved securely and the voice training process has started. This may take some time.
                        </p>
                        <button
                            onClick={() => {
                                setStep('upload');
                                setFiles([]);
                                setName('');
                                setDescription('');
                                setRecordingBlob(null);
                                setVoiceId(null);
                            }}
                            className={`${buttons.secondary} mt-4`}
                        >
                            Create Another Voice
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
