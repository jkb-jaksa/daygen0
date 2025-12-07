import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { buttons, inputs, text } from "../../../styles/designSystem";
import {
  Mic,
  Upload,
  PenTool,
  Wand2,
  Sparkles,
  Activity,
  Loader2,
  Download,
  Play,
  Pause,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "../../../hooks/useToast";
import {
  cloneElevenLabsVoice,
  generateElevenLabsSpeech,
  createProfessionalVoice,
  verifyProfessionalVoice,
  type ElevenLabsVoiceSummary,
} from "../../../utils/audioApi";
import { VoiceSelector } from "../../shared/VoiceSelector";
import { VoiceUploader } from "../../shared/VoiceUploader";

type VoiceFlowMode = "menu" | "record" | "design" | "pvc";

type AudioVoiceStudioProps = {
  onBack?: () => void;
};

type RecordingState = {
  isRecording: boolean;
  durationMs: number;
  audioUrl: string | null;
  blob: Blob | null;
  error: string | null;
};

const MAX_RECORDING_MINUTES = 5;

const formatDuration = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
};

const base64ToBlob = (base64: string, contentType: string) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: contentType });
};

type GeneratedVariation = {
  id: string;
  url: string;
  blob: Blob;
};

export function AudioVoiceStudio({ onBack }: AudioVoiceStudioProps) {
  const [mode, setMode] = useState<VoiceFlowMode>("menu");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    durationMs: 0,
    audioUrl: null,
    blob: null,
    error: null,
  });

  const recordingChunksRef = useRef<BlobPart[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingIntervalRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scriptInputRef = useRef<HTMLTextAreaElement>(null);
  const voiceModalityTextRef = useRef<HTMLTextAreaElement>(null);
  const [script, setScript] = useState("");
  const [voiceModalityText, setVoiceModalityText] = useState("");
  const [modelId, setModelId] = useState("eleven_multilingual_v2");
  const [voiceName, setVoiceName] = useState("My Digital Voice");
  const [voiceDescription, setVoiceDescription] = useState(
    "Digital copy voice sample",
  );
  const { showToast } = useToast();
  // recentVoice is used to locally cache a newly created voice so it appears in the list immediately
  const [recentVoice, setRecentVoice] =
    useState<ElevenLabsVoiceSummary | null>(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const [isGeneratingSpeech, setIsGeneratingSpeech] = useState(false);
  const [variations, setVariations] = useState<GeneratedVariation[]>([]);
  const [selectedVariationId, setSelectedVariationId] = useState<string | null>(null);
  const [playingVariationId, setPlayingVariationId] = useState<string | null>(null);
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const [designError, setDesignError] = useState<string | null>(null);
  const [isUploadingVoiceClone, setIsUploadingVoiceClone] = useState(false);
  const [isSavingRecordingClone, setIsSavingRecordingClone] = useState(false);
  const [cloneError, setCloneError] = useState<string | null>(null);

  // PVC State
  const [isPvcFlow, setIsPvcFlow] = useState(false);
  const [pvcStep, setPvcStep] = useState<"initial" | "verification" | "complete">("initial");
  const [pvcCaptcha, setPvcCaptcha] = useState<string | null>(null);
  const [pvcVoiceId, setPvcVoiceId] = useState<string | null>(null);
  const [isPvcLoading, setIsPvcLoading] = useState(false);

  const stopRecording = useCallback(
    (silent = false) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder) {
        return;
      }
      if (recorder.state !== "inactive") {
        recorder.stop();
      }
      mediaRecorderRef.current = null;
      if (recordingIntervalRef.current) {
        window.clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      if (silent) {
        recordingStreamRef.current
          ?.getTracks()
          .forEach((track) => track.stop());
        recordingStreamRef.current = null;
        recordingChunksRef.current = [];
        setRecordingState((prev) => {
          if (prev.audioUrl) {
            URL.revokeObjectURL(prev.audioUrl);
          }
          return {
            isRecording: false,
            durationMs: 0,
            audioUrl: null,
            blob: null,
            error: null,
          };
        });
      }
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        window.clearInterval(recordingIntervalRef.current);
      }
      if (recordingState.audioUrl) {
        URL.revokeObjectURL(recordingState.audioUrl);
      }
      stopRecording(true);
    };
  }, [stopRecording, recordingState.audioUrl]);

  useEffect(() => {
    return () => {
      variations.forEach((v) => URL.revokeObjectURL(v.url));
    };
  }, [variations]);

  useEffect(() => {
    if (designError && script.trim()) {
      setDesignError(null);
    }
  }, [designError, script]);

  const resetUpload = useCallback(() => {
    setSelectedFile(null);
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setFilePreviewUrl(null);
    setCloneError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [filePreviewUrl]);

  const handleReturnToMenu = useCallback(() => {
    if (onBack) {
      onBack();
    } else {
      setMode("menu");
    }
    resetUpload();
    if (recordingState.audioUrl) {
      URL.revokeObjectURL(recordingState.audioUrl);
    }
    setRecordingState((prev) => ({
      ...prev,
      isRecording: false,
      durationMs: 0,
      audioUrl: null,
      blob: null,
      error: null,
    }));
    variations.forEach((v) => URL.revokeObjectURL(v.url));
    setVariations([]);
    setSelectedVariationId(null);
    setPlayingVariationId(null);
    setDesignError(null);
    setCloneError(null);
  }, [recordingState.audioUrl, resetUpload, onBack, variations]);

  const handleVoicesLoaded = useCallback(
    (voices: ElevenLabsVoiceSummary[]) => {
      // If we have a selected voice already, don't change it unless it's invalid
      // Otherwise select the first available voice
      if (
        !selectedVoiceId &&
        voices.length > 0
      ) {
        setSelectedVoiceId(voices[0].voice_id);
      }
    },
    [selectedVoiceId],
  );

  const handleFileSelect = useCallback(
    (file: File | null) => {
      if (!file) {
        resetUpload();
        return;
      }
      if (!file.type.startsWith("audio/")) {
        setRecordingState((prev) => ({
          ...prev,
          error: "Please choose a valid audio file.",
        }));
        resetUpload();
        return;
      }

      setRecordingState((prev) => ({ ...prev, error: null }));
      setSelectedFile(file);
      const objectUrl = URL.createObjectURL(file);
      if (filePreviewUrl) {
        URL.revokeObjectURL(filePreviewUrl);
      }
      setFilePreviewUrl(objectUrl);
    },
    [filePreviewUrl, resetUpload],
  );

  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      handleFileSelect(file ?? null);
    },
    [handleFileSelect],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const files = Array.from(event.dataTransfer.files);
      if (!files.length) {
        return;
      }
      handleFileSelect(files[0]);
    },
    [handleFileSelect],
  );

  const cloneVoiceFromSource = useCallback(
    async (file: File | Blob, source: "upload" | "record") => {
      const setLoading =
        source === "upload"
          ? setIsUploadingVoiceClone
          : setIsSavingRecordingClone;
      setLoading(true);
      setCloneError(null);

      try {
        const name = voiceName.trim() || undefined;
        const description = voiceDescription.trim() || undefined;
        const labels: Record<string, string> = {
          source,
          workspace: "daygen",
        };

        const result = await cloneElevenLabsVoice(file, {
          name,
          description,
          labels,
        });
        setRecentVoice(result.voice);
        setSelectedVoiceId(result.voice.voice_id);
        showToast(`Voice "${result.voice.name}" saved to ElevenLabs.`);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to save voice to ElevenLabs.";
        setCloneError(message);
        showToast(message);
      } finally {
        setLoading(false);
      }
    },
    [showToast, voiceDescription, voiceName],
  );

  const handleUploadClone = useCallback(() => {
    if (!selectedFile) {
      setCloneError("Please choose an audio file first.");
      return;
    }
    void cloneVoiceFromSource(selectedFile, "upload");
  }, [cloneVoiceFromSource, selectedFile]);

  const handleRecordingClone = useCallback(() => {
    if (!recordingState.blob) {
      setCloneError("Record a clip before saving it to ElevenLabs.");
      return;
    }
    const recordingFile = new File(
      [recordingState.blob],
      `recording-${Date.now()}.webm`,
      {
        type: recordingState.blob.type || "audio/webm",
      },
    );
    void cloneVoiceFromSource(recordingFile, "record");
    void cloneVoiceFromSource(recordingFile, "record");
  }, [cloneVoiceFromSource, recordingState.blob]);

  const handleStartPvc = useCallback(async () => {
    if (!recordingState.blob) {
      setCloneError("Record a sample first.");
      return;
    }
    setIsPvcLoading(true);
    setCloneError(null);
    try {
      const recordingFile = new File(
        [recordingState.blob],
        `sample-${Date.now()}.webm`,
        { type: recordingState.blob.type || "audio/webm" }
      );

      const result = await createProfessionalVoice([recordingFile], {
        name: voiceName.trim() || undefined,
        description: voiceDescription.trim() || undefined,
        labels: { source: "record", type: "pvc", workspace: "daygen" },
      });

      setPvcVoiceId(result.voiceId);
      setPvcCaptcha(result.captcha || null); // Base64 string
      setPvcStep("verification");
      setIsPvcFlow(true);

      // Reset recording state for the verification step
      setRecordingState({
        isRecording: false,
        durationMs: 0,
        audioUrl: null,
        blob: null,
        error: null,
      });

    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start PVC.";
      setCloneError(message);
      showToast(message);
    } finally {
      setIsPvcLoading(false);
    }
  }, [recordingState.blob, voiceName, voiceDescription, showToast]);

  const handleVerifyPvc = useCallback(async () => {
    if (!recordingState.blob || !pvcVoiceId) {
      setCloneError("Record the verification text first.");
      return;
    }
    setIsPvcLoading(true);
    setCloneError(null);
    try {
      const verificationFile = new File(
        [recordingState.blob],
        `verification-${Date.now()}.webm`,
        { type: recordingState.blob.type || "audio/webm" }
      );

      await verifyProfessionalVoice(verificationFile, pvcVoiceId);

      setPvcStep("complete");
      showToast("Verification submitted! Training started.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Verification failed.";
      setCloneError(message);
      showToast(message);
    } finally {
      setIsPvcLoading(false);
    }
  }, [recordingState.blob, pvcVoiceId, showToast]);

  const handleGenerateSpeech = useCallback(async () => {
    if (!script.trim()) {
      setDesignError("Please add a short script to generate a preview.");
      return;
    }
    setIsGeneratingSpeech(true);
    setDesignError(null);

    // Clear previous variations
    variations.forEach((v) => URL.revokeObjectURL(v.url));
    setVariations([]);
    setSelectedVariationId(null);
    setPlayingVariationId(null);

    try {
      // Generate 3 variations concurrently
      const promises = Array(3).fill(null).map(() =>
        generateElevenLabsSpeech({
          text: script,
          voiceId: selectedVoiceId ?? undefined,
          modelId,
        })
      );

      const results = await Promise.all(promises);

      const newVariations: GeneratedVariation[] = results.map((result, index) => {
        console.log(`Variation ${index} received:`, {
          contentType: result.contentType,
          base64Length: result.audioBase64?.length,
          base64Prefix: result.audioBase64?.substring(0, 50)
        });

        const blob = base64ToBlob(result.audioBase64, result.contentType);
        return {
          id: `var-${Date.now()}-${index}`,
          url: URL.createObjectURL(blob),
          blob,
        };
      });

      setVariations(newVariations);
      if (newVariations.length > 0) {
        setSelectedVariationId(newVariations[0].id);
      }
      showToast("Voice variations ready.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to generate voice preview.";
      setDesignError(message);
      showToast(message);
    } finally {
      setIsGeneratingSpeech(false);
    }
  }, [
    script,
    selectedVoiceId,
    modelId,
    showToast,
    variations,
  ]);

  const togglePlayVariation = async (id: string) => {
    const audio = audioRefs.current[id];
    if (!audio) return;

    try {
      if (playingVariationId === id) {
        audio.pause();
        setPlayingVariationId(null);
      } else {
        // Stop currently playing if any
        if (playingVariationId && audioRefs.current[playingVariationId]) {
          const prevAudio = audioRefs.current[playingVariationId];
          if (prevAudio) {
            prevAudio.pause();
            prevAudio.currentTime = 0;
          }
        }

        // Update state first to reflect intent
        setPlayingVariationId(id);

        // Reset time to 0 to ensure full playback
        audio.currentTime = 0;
        await audio.play();
      }
    } catch (error) {
      // Ignore AbortError which happens if playback is interrupted by another play/pause
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Playback interrupted (AbortError)');
        return;
      }
      console.error('Playback failed:', error);
      setPlayingVariationId(null);
      showToast("Could not play audio.");
    }
  };

  const handleDownload = () => {
    const selected = variations.find(v => v.id === selectedVariationId);
    if (!selected) return;

    const a = document.createElement('a');
    a.href = selected.url;
    a.download = `generated-voice-${Date.now()}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleClearScript = useCallback(() => {
    setScript("");
    variations.forEach((v) => URL.revokeObjectURL(v.url));
    setVariations([]);
    setSelectedVariationId(null);
    setPlayingVariationId(null);
    setDesignError(null);
  }, [variations]);

  const startRecording = useCallback(async () => {
    try {

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      recordingStreamRef.current = stream;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, {
          type: mediaRecorder.mimeType || "audio/webm",
        });
        const objectUrl = URL.createObjectURL(blob);
        if (recordingState.audioUrl) {
          URL.revokeObjectURL(recordingState.audioUrl);
        }
        setRecordingState((prev) => ({
          ...prev,
          isRecording: false,
          audioUrl: objectUrl,
          blob,
        }));
        stream.getTracks().forEach((track) => track.stop());
        mediaRecorderRef.current = null;
        recordingStreamRef.current = null;
        recordingChunksRef.current = [];

        if (recordingIntervalRef.current) {
          window.clearInterval(recordingIntervalRef.current);
          recordingIntervalRef.current = null;
        }
      };

      mediaRecorder.start();
      setRecordingState({
        isRecording: true,
        durationMs: 0,
        audioUrl: null,
        blob: null,
        error: null,
      });
      const startTime = Date.now();
      recordingIntervalRef.current = window.setInterval(() => {
        setRecordingState((prev) => {
          if (!prev.isRecording) {
            return prev;
          }
          const elapsedMs = Date.now() - startTime;
          const maxDuration = MAX_RECORDING_MINUTES * 60 * 1000;
          if (elapsedMs >= maxDuration) {
            stopRecording();
            return {
              ...prev,
              durationMs: maxDuration,
              error: `Recording limit reached (${MAX_RECORDING_MINUTES} minutes).`,
            };
          }
          return {
            ...prev,
            durationMs: elapsedMs,
          };
        });
      }, 250);
    } catch (error) {
      console.error("Failed to start recording", error);
      setRecordingState({
        isRecording: false,
        durationMs: 0,
        audioUrl: null,
        blob: null,
        error:
          error instanceof Error
            ? error.message
            : "We couldn't access your microphone.",
      });
    }
  }, [recordingState.audioUrl, stopRecording]);

  const recordingStatusLabel = useMemo(() => {
    if (recordingState.error) {
      return recordingState.error;
    }
    if (recordingState.isRecording) {
      return "Recording in progress…";
    }
    if (recordingState.audioUrl) {
      return "Recording complete.";
    }
    return "Click start to begin recording.";
  }, [recordingState]);

  const renderMenu = () => (
    <div
      className="relative w-full h-full flex items-center justify-center"
      onDragOver={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center gap-8 text-center w-full px-2">
        <div className="space-y-2">
          <h2 className={`${text.sectionHeading} text-theme-text`}>
            Upload your voice recording
          </h2>
          <p className="max-w-4xl text-sm font-raleway text-theme-white">
            Click anywhere or drag and drop to get started. You can record a new
            clip, upload an existing file, or design a custom voice with
            ElevenLabs.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-4">
          <button
            className={`${buttons.primary} inline-flex items-center gap-2`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="size-4" />
            Upload
          </button>
          <button
            className={`${buttons.secondary} inline-flex items-center gap-2`}
            onClick={() => setMode("record")}
          >
            <Activity className="size-4" />
            Record
          </button>
          <button
            className={`${buttons.pillWarm} inline-flex items-center gap-2`}
            onClick={() => setMode("design")}
          >
            <Sparkles className="size-4" />
            Design
          </button>
          <button
            className={`${buttons.pillWarm} inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 border-none`}
            onClick={() => setMode("pvc")}
          >
            <Sparkles className="size-4" />
            Professional Clone
          </button>
        </div>
        <div className="w-full max-w-6xl space-y-2">
          <label className="block text-left text-sm font-raleway text-theme-text">
            Text for Voice Modality
            <textarea
              ref={voiceModalityTextRef}
              value={voiceModalityText}
              onChange={(event) => setVoiceModalityText(event.target.value)}
              style={{ resize: 'none' }}
              className={`${inputs.textarea} resize-none mt-2`}
              placeholder="Enter text that can be used in Voice Modality..."
              rows={4}
            />
          </label>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileInputChange}
          className="hidden"
        />
        {selectedFile && filePreviewUrl && (
          <div className="mt-8 w-full space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col text-left text-sm font-raleway text-theme-text">
                Voice name
                <input
                  type="text"
                  value={voiceName}
                  onChange={(event) => setVoiceName(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-theme-dark bg-theme-black/60 px-4 py-3 text-sm text-theme-white focus:border-theme-text focus:outline-none focus:ring-0"
                  placeholder="Digital Copy Voice"
                />
              </label>
              <label className="md:col-span-2 flex flex-col text-left text-sm font-raleway text-theme-text">
                Notes for ElevenLabs
                <textarea
                  value={voiceDescription}
                  onChange={(event) => setVoiceDescription(event.target.value)}
                  className="mt-2 h-28 w-full resize-none rounded-2xl border border-theme-dark bg-theme-black/60 px-4 py-3 text-sm text-theme-white focus:border-theme-text focus:outline-none focus:ring-0"
                  placeholder="What makes this voice unique? Mention accent, pacing, or context."
                />
              </label>
            </div>
            <div className="rounded-3xl border border-theme-dark bg-theme-black/40 p-6">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Mic className="size-5 text-cyan-300" />
                    <div className="text-left">
                      <p className="text-sm font-raleway text-theme-text">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs font-raleway text-theme-white/60">
                        {Math.round(selectedFile.size / 1024)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleFileSelect(null)}
                    className="text-xs font-raleway text-theme-white/70 transition-colors duration-200 hover:text-theme-text"
                  >
                    Remove
                  </button>
                </div>
                <audio
                  src={filePreviewUrl}
                  controls
                  className="w-full"
                  style={{ borderRadius: "12px", height: "46px" }}
                />
              </div>
            </div>
            <div className="flex flex-col items-center gap-3 text-center">
              <button
                className={`${buttons.pillWarm} inline-flex items-center gap-2`}
                onClick={handleUploadClone}
                disabled={isUploadingVoiceClone}
              >
                {isUploadingVoiceClone ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving voice…
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    Save to ElevenLabs
                  </>
                )}
              </button>
              <p className="text-xs font-raleway text-theme-white/60">
                We'll create a private voice profile in ElevenLabs with this
                sample.
              </p>
            </div>
            {cloneError && (
              <p className="text-center text-sm font-raleway text-red-400">
                {cloneError}
              </p>
            )}
            {recentVoice && (
              <div className="rounded-3xl border border-theme-dark bg-theme-black/40 p-6 text-left">
                <p className="text-sm font-raleway text-theme-text">
                  Last saved voice: {recentVoice.name}
                </p>
                <p className="text-xs font-mono text-theme-white/60">
                  Voice ID: {recentVoice.voice_id}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );


  const renderRecording = () => (
    <div className="relative w-full">
      <button
        onClick={() => {
          if (recordingState.isRecording) {
            stopRecording();
          }
          handleReturnToMenu();
        }}
        className="mb-6 inline-flex items-center gap-2 text-sm font-raleway text-theme-white/80 transition-colors duration-200 hover:text-theme-text"
      >
        ← Back
      </button>
      <div className="flex flex-col items-center gap-8 text-center">
        <div className="grid size-20 place-items-center rounded-[36px] border border-white/10 bg-theme-black/40">
          <Mic className="size-10 text-cyan-300" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-raleway text-theme-text">
            Record your voice
          </h2>
          <p className="max-w-lg text-sm font-raleway text-theme-white/80">
            We'll capture high-quality audio from your microphone. Record up to{" "}
            {MAX_RECORDING_MINUTES} minutes. You can review and re-record before
            saving.
          </p>
        </div>
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3 rounded-full border border-theme-dark bg-theme-black/50 px-4 py-2 text-sm font-raleway text-theme-text">
            <span
              className={`size-2 rounded-full ${recordingState.isRecording ? "animate-pulse bg-red-500" : "bg-theme-white/50"
                }`}
            />
            <span>{recordingStatusLabel}</span>
          </div>
          <div className="text-4xl font-mono text-theme-text">
            {formatDuration(recordingState.durationMs)}
          </div>
        </div>
        {recordingState.audioUrl && !isPvcFlow && (
          <div className="flex flex-col gap-4 mt-4">
            <div className="flex justify-center gap-4">
              <button
                className={`${buttons.secondary} inline-flex items-center gap-2`}
                onClick={() => {
                  if (scriptInputRef.current) {
                    scriptInputRef.current.focus({ preventScroll: true });
                  }
                }}
              >
                <PenTool className="size-4" />
                Add script notes
              </button>
              <button
                className={`${buttons.pillWarm} inline-flex items-center gap-2`}
                onClick={handleStartPvc}
                disabled={isPvcLoading}
              >
                {isPvcLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                Create Professional Voice
              </button>
            </div>
            <p className="text-xs text-theme-white/60 max-w-md mx-auto">
              Professional Voice Cloning creates a high-fidelity clone. Requires verification.
            </p>
          </div>
        )}
        {isPvcFlow && pvcStep === "verification" && (
          <div className="mt-6 w-full max-w-2xl space-y-6 rounded-3xl border border-theme-dark bg-theme-black/40 p-6">
            <div className="text-left space-y-4">
              <h3 className="text-lg font-raleway text-theme-text">Voice Verification</h3>
              <p className="text-sm text-theme-white/80">
                To verify your voice, please read the text in the image below clearly.
              </p>

              {pvcCaptcha && (
                <div className="bg-white p-4 rounded-xl flex justify-center">
                  {/* Assuming captcha is base64 image data */}
                  <img src={`data:image/png;base64,${pvcCaptcha}`} alt="Verification Captcha" className="max-h-32" />
                </div>
              )}

              <div className="flex flex-col items-center gap-4 pt-4">
                <div className="flex items-center gap-3 rounded-full border border-theme-dark bg-theme-black/50 px-4 py-2 text-sm font-raleway text-theme-text">
                  <span
                    className={`size-2 rounded-full ${recordingState.isRecording ? "animate-pulse bg-red-500" : "bg-theme-white/50"
                      }`}
                  />
                  <span>{recordingStatusLabel}</span>
                </div>

                {!recordingState.isRecording && !recordingState.audioUrl && (
                  <button
                    className={`${buttons.primary} inline-flex items-center gap-2`}
                    onClick={startRecording}
                  >
                    <Mic className="size-4" />
                    Record Verification
                  </button>
                )}

                {recordingState.isRecording && (
                  <button
                    className="inline-flex items-center gap-2 rounded-full bg-red-500 px-6 py-3 text-sm font-raleway text-white transition-colors duration-200 hover:bg-red-600"
                    onClick={() => stopRecording()}
                  >
                    <SquareIcon />
                    Stop Recording
                  </button>
                )}

                {recordingState.audioUrl && (
                  <div className="flex gap-4">
                    <button
                      className={`${buttons.secondary} inline-flex items-center gap-2`}
                      onClick={() => {
                        setRecordingState(prev => ({ ...prev, audioUrl: null, blob: null }));
                      }}
                    >
                      Re-record
                    </button>
                    <button
                      className={`${buttons.pillWarm} inline-flex items-center gap-2`}
                      onClick={handleVerifyPvc}
                      disabled={isPvcLoading}
                    >
                      {isPvcLoading ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                      Submit Verification
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {isPvcFlow && pvcStep === "complete" && (
          <div className="mt-6 w-full max-w-md rounded-3xl border border-green-500/30 bg-green-500/10 p-6">
            <h3 className="text-lg font-raleway text-green-400 mb-2">Training Started!</h3>
            <p className="text-sm text-theme-white/80">
              Your professional voice clone is now training. This process may take several hours.
              You will be notified when it is ready.
            </p>
            <button
              className={`${buttons.secondary} mt-4`}
              onClick={handleReturnToMenu}
            >
              Return to Menu
            </button>
          </div>
        )}
        {recordingState.audioUrl && (
          <div className="mt-6 w-full rounded-3xl border border-theme-dark bg-theme-black/40 p-6">
            <audio
              src={recordingState.audioUrl}
              controls
              className="w-full"
              style={{ borderRadius: "12px", height: "46px" }}
            />
          </div>
        )}
        {recordingState.audioUrl && (
          <div className="flex flex-col items-center gap-3 text-center">
            <button
              className={`${buttons.pillWarm} inline-flex items-center gap-2`}
              onClick={handleRecordingClone}
              disabled={isSavingRecordingClone}
            >
              {isSavingRecordingClone ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving voice…
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Save to ElevenLabs
                </>
              )}
            </button>
            <p className="text-xs font-raleway text-theme-white/60">
              Upload this recording to ElevenLabs as a reference voice.
            </p>
          </div>
        )}
        {cloneError && (
          <p className="mt-6 text-center text-sm font-raleway text-red-400">
            {cloneError}
          </p>
        )}
        {recentVoice && (
          <div className="mt-6 rounded-3xl border border-theme-dark bg-theme-black/40 p-6 text-left">
            <p className="text-sm font-raleway text-theme-text">
              Last saved voice: {recentVoice.name}
            </p>
            <p className="text-xs font-mono text-theme-white/60">
              Voice ID: {recentVoice.voice_id}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderDesign = () => (
    <div className="relative w-full">
      <button
        onClick={handleReturnToMenu}
        className="mb-6 inline-flex items-center gap-2 text-sm font-raleway text-theme-white/80 transition-colors duration-200 hover:text-theme-text"
      >
        ← Back
      </button>
      <div className="flex flex-col gap-8">
        <header className="space-y-3 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-3xl border border-white/10 bg-theme-black/40">
            <Wand2 className="size-6 text-amber-300" />
          </div>
          <h2 className="text-3xl font-raleway text-theme-text">
            Design a custom voice
          </h2>
          <p className="mx-auto max-w-2xl text-sm font-raleway text-theme-white/80">
            Convert your script into a lifelike narration powered by ElevenLabs.
            Choose a base model, tweak the tone, and add reference notes to
            tailor the delivery.
          </p>
        </header>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <label className="block text-sm font-raleway text-theme-text">
              Voice name
              <input
                type="text"
                value={voiceName}
                onChange={(event) => setVoiceName(event.target.value)}
                className="mt-1 w-full rounded-2xl border border-theme-dark bg-theme-black/60 px-4 py-3 text-sm text-theme-white focus:border-theme-text focus:outline-none focus:ring-0"
                placeholder="My Digital Voice"
              />
            </label>
            <label className="block text-sm font-raleway text-theme-text">
              Voice preset
              <VoiceSelector
                value={selectedVoiceId ?? ""}
                onChange={setSelectedVoiceId}
                className="mt-1 w-full"
                recentVoice={recentVoice}
                onLoaded={handleVoicesLoaded}
              />
            </label>
            <label className="block text-sm font-raleway text-theme-text">
              Base model
              <select
                value={modelId}
                onChange={(event) => setModelId(event.target.value)}
                className="mt-1 w-full rounded-2xl border border-theme-dark bg-theme-black/60 px-4 py-3 text-sm text-theme-white focus:border-theme-text focus:outline-none focus:ring-0"
              >
                <option value="eleven_v3">Eleven v3 (alpha)</option>
                <option value="eleven_multilingual_v2">
                  Eleven Multilingual v2
                </option>
                <option value="eleven_flash_v2_5">Eleven Flash v2.5</option>
                <option value="eleven_turbo_v2_5">Eleven Turbo v2.5</option>
              </select>
            </label>
            <label className="block text-sm font-raleway text-theme-text">
              Delivery style
              <select
                className="mt-1 w-full rounded-2xl border border-theme-dark bg-theme-black/60 px-4 py-3 text-sm text-theme-white focus:border-theme-text focus:outline-none focus:ring-0"
              >
                <option value="balanced">Balanced</option>
                <option value="narration">Narration</option>
                <option value="engaging">Engaging</option>
                <option value="conversational">Conversational</option>
              </select>
            </label>
          </div>
          <div className="space-y-4">
            <label className="block text-sm font-raleway text-theme-text">
              Script
              <textarea
                ref={scriptInputRef}
                value={script}
                onChange={(event) => setScript(event.target.value)}
                className="mt-1 h-40 w-full resize-none rounded-2xl border border-theme-dark bg-theme-black/60 px-4 py-3 text-sm text-theme-white focus:border-theme-text focus:outline-none focus:ring-0"
                placeholder="Write the words you would like your voice to speak…"
              />
            </label>
            <div className="space-y-2 text-left">
              <p className="text-xs font-raleway uppercase tracking-[0.2em] text-theme-white/40">
                Optional notes
              </p>
              <p className="text-sm font-raleway text-theme-white/70">
                Mention pacing, pronunciation, or emotional cues. You can attach
                a reference recording from the upload or recording steps.
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm font-raleway text-theme-white/70">
            <PenTool className="size-4 text-theme-white/60" />
            <span>Powered by ElevenLabs text-to-speech</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              className={`${buttons.secondary} inline-flex items-center gap-2`}
              onClick={handleClearScript}
            >
              Clear script
            </button>
            <button
              className={`${buttons.primary} inline-flex items-center gap-2`}
              onClick={handleGenerateSpeech}
              disabled={!script.trim() || isGeneratingSpeech}
            >
              {isGeneratingSpeech ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Generate preview
                </>
              )}
            </button>
          </div>
        </div>
        {designError && (
          <p className="text-center text-sm font-raleway text-red-400">
            {designError}
          </p>
        )}
        {variations.length > 0 && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {variations.map((variation, index) => (
                <div
                  key={variation.id}
                  className={`relative flex flex-col gap-3 rounded-3xl border p-4 transition-all duration-200 ${selectedVariationId === variation.id
                    ? "border-cyan-400 bg-theme-black/60 shadow-[0_0_20px_-5px_rgba(34,211,238,0.3)]"
                    : "border-theme-dark bg-theme-black/40 hover:border-theme-white/30"
                    }`}
                  onClick={() => setSelectedVariationId(variation.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-raleway font-bold text-theme-white/80">
                      Variation {index + 1}
                    </span>
                    {selectedVariationId === variation.id && (
                      <CheckCircle2 className="size-4 text-cyan-400" />
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePlayVariation(variation.id);
                      }}
                      className="grid size-10 place-items-center rounded-full bg-theme-white/10 text-theme-white transition-colors hover:bg-theme-white/20"
                    >
                      {playingVariationId === variation.id ? (
                        <Pause className="size-4 fill-current" />
                      ) : (
                        <Play className="size-4 fill-current ml-0.5" />
                      )}
                    </button>
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-theme-white/10">
                      {/* Simple visualizer placeholder */}
                      <div className="h-full w-2/3 bg-gradient-to-r from-cyan-500 to-blue-500 opacity-50" />
                    </div>
                  </div>

                  <audio
                    ref={(el) => { audioRefs.current[variation.id] = el; }}
                    src={variation.url}
                    onEnded={() => setPlayingVariationId(null)}
                    className="hidden"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-center pt-2">
              <button
                className={`${buttons.primary} inline-flex items-center gap-2`}
                onClick={handleDownload}
                disabled={!selectedVariationId}
              >
                <Download className="size-4" />
                Download Selected MP3
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (mode === "pvc") {
    return (
      <div className="w-full max-w-2xl mx-auto py-10">
        <button
          onClick={handleReturnToMenu}
          className="mb-6 text-sm text-gray-400 hover:text-white flex items-center gap-2"
        >
          ← Back to Menu
        </button>
        <VoiceUploader onSuccess={() => setMode("menu")} />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {mode === "menu" && renderMenu()}
      {mode === "record" && renderRecording()}
      {mode === "design" && renderDesign()}
    </div>
  );
}

function SquareIcon() {
  return (
    <span className="grid size-3 place-items-center rounded-[3px] border border-white/30 bg-white/90" />
  );
}

export default AudioVoiceStudio;
