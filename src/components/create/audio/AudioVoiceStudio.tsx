import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buttons, inputs, text } from "../../../styles/designSystem";
import {
  Mic,
  Upload,
  PenTool,
  Wand2,
  Sparkles,
  Activity,
  Loader2,
} from "lucide-react";
import { useToast } from "../../../hooks/useToast";
import {
  cloneElevenLabsVoice,
  fetchElevenLabsVoices,
  generateElevenLabsSpeech,
  type ElevenLabsVoiceSummary,
} from "../../../utils/audioApi";

type VoiceFlowMode = "menu" | "record" | "design";

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

const base64ToObjectUrl = (base64: string, contentType: string) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: contentType });
  return URL.createObjectURL(blob);
};

export function AudioVoiceStudio() {
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
  const [recordingIntent, setRecordingIntent] = useState<"idle" | "requesting">(
    "idle",
  );
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
  const [availableVoices, setAvailableVoices] = useState<
    ElevenLabsVoiceSummary[]
  >([]);
  const [recentVoice, setRecentVoice] =
    useState<ElevenLabsVoiceSummary | null>(null);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [voicesError, setVoicesError] = useState<string | null>(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const [isGeneratingSpeech, setIsGeneratingSpeech] = useState(false);
  const [generatedPreviewUrl, setGeneratedPreviewUrl] = useState<string | null>(
    null,
  );
  const [designError, setDesignError] = useState<string | null>(null);
  const [isUploadingVoiceClone, setIsUploadingVoiceClone] = useState(false);
  const [isSavingRecordingClone, setIsSavingRecordingClone] = useState(false);
  const [cloneError, setCloneError] = useState<string | null>(null);

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

  const voiceOptions = useMemo(() => {
    const combined = [...availableVoices];
    if (
      recentVoice &&
      !combined.some((voice) => voice.id === recentVoice.id)
    ) {
      combined.unshift(recentVoice);
    }
    return combined;
  }, [availableVoices, recentVoice]);

  useEffect(() => {
    if (voiceOptions.length > 0 && !selectedVoiceId) {
      setSelectedVoiceId(voiceOptions[0].id);
    }
  }, [voiceOptions, selectedVoiceId]);

  useEffect(() => {
    if (
      mode !== "design" ||
      isLoadingVoices ||
      availableVoices.length > 0
    ) {
      return;
    }

    let isCancelled = false;
    setIsLoadingVoices(true);
    setVoicesError(null);

    void fetchElevenLabsVoices()
      .then((response) => {
        if (isCancelled) {
          return;
        }
        const voices = Array.isArray(response.voices) ? response.voices : [];
        setAvailableVoices(voices);
        if (voices.length > 0) {
          setSelectedVoiceId((current) => current ?? voices[0].id);
        }
      })
      .catch((error) => {
        if (isCancelled) {
          return;
        }
        const message =
          error instanceof Error
            ? error.message
            : "Unable to load voices from ElevenLabs.";
        setVoicesError(message);
        showToast(message);
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingVoices(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [
    availableVoices.length,
    isLoadingVoices,
    mode,
    showToast,
  ]);

  useEffect(() => {
    return () => {
      if (generatedPreviewUrl) {
        URL.revokeObjectURL(generatedPreviewUrl);
      }
    };
  }, [generatedPreviewUrl]);

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
    setMode("menu");
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
    if (generatedPreviewUrl) {
      URL.revokeObjectURL(generatedPreviewUrl);
    }
    setGeneratedPreviewUrl(null);
    setDesignError(null);
    setCloneError(null);
  }, [generatedPreviewUrl, recordingState.audioUrl, resetUpload]);

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
        setSelectedVoiceId(result.voice.id);
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
  }, [cloneVoiceFromSource, recordingState.blob]);

  const handleGenerateSpeech = useCallback(async () => {
    if (!script.trim()) {
      setDesignError("Please add a short script to generate a preview.");
      return;
    }
    setIsGeneratingSpeech(true);
    setDesignError(null);

    try {
      const result = await generateElevenLabsSpeech({
        text: script,
        voiceId: selectedVoiceId ?? undefined,
        modelId,
      });
      if (generatedPreviewUrl) {
        URL.revokeObjectURL(generatedPreviewUrl);
      }
      const objectUrl = base64ToObjectUrl(
        result.audioBase64,
        result.contentType,
      );
      setGeneratedPreviewUrl(objectUrl);
      showToast("Voice preview ready.");
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
    generatedPreviewUrl,
    modelId,
    script,
    selectedVoiceId,
    showToast,
  ]);

  const handleClearScript = useCallback(() => {
    setScript("");
    if (generatedPreviewUrl) {
      URL.revokeObjectURL(generatedPreviewUrl);
    }
    setGeneratedPreviewUrl(null);
    setDesignError(null);
  }, [generatedPreviewUrl]);

  const startRecording = useCallback(async () => {
    try {
      setRecordingIntent("requesting");
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
    } finally {
      setRecordingIntent("idle");
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
                  Voice ID: {recentVoice.id}
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
              className={`size-2 rounded-full ${
                recordingState.isRecording ? "animate-pulse bg-red-500" : "bg-theme-white/50"
              }`}
            />
            <span>{recordingStatusLabel}</span>
          </div>
          <div className="text-4xl font-mono text-theme-text">
            {formatDuration(recordingState.durationMs)}
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {!recordingState.isRecording && (
              <button
                className={`${buttons.primary} inline-flex items-center gap-2`}
                onClick={startRecording}
                disabled={recordingIntent === "requesting"}
              >
                {recordingIntent === "requesting" ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Starting…
                  </>
                ) : (
                  <>
                    <Activity className="size-4" />
                    Start Recording
                  </>
                )}
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
            )}
          </div>
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
        </div>
      </div>
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
            Voice ID: {recentVoice.id}
          </p>
        </div>
      )}
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
              <select
                value={selectedVoiceId ?? ""}
                onChange={(event) =>
                  setSelectedVoiceId(
                    event.target.value ? event.target.value : null,
                  )
                }
                className="mt-1 w-full rounded-2xl border border-theme-dark bg-theme-black/60 px-4 py-3 text-sm text-theme-white focus:border-theme-text focus:outline-none focus:ring-0"
                disabled={voiceOptions.length === 0 && isLoadingVoices}
              >
                {voiceOptions.length === 0 ? (
                  <option value="">
                    {isLoadingVoices
                      ? "Loading voices…"
                      : "No voices yet — upload or record first"}
                  </option>
                ) : (
                  voiceOptions.map((voice) => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name || voice.id}
                    </option>
                  ))
                )}
              </select>
              {voicesError && (
                <p className="mt-1 text-xs font-raleway text-red-400">
                  {voicesError}
                </p>
              )}
            </label>
            <label className="block text-sm font-raleway text-theme-text">
              Base model
              <select
                value={modelId}
                onChange={(event) => setModelId(event.target.value)}
                className="mt-1 w-full rounded-2xl border border-theme-dark bg-theme-black/60 px-4 py-3 text-sm text-theme-white focus:border-theme-text focus:outline-none focus:ring-0"
              >
                <option value="eleven_multilingual_v2">
                  Eleven Multilingual v2
                </option>
                <option value="eleven_turbo_v2">Eleven Turbo v2</option>
                <option value="eleven_english_v1">Eleven English v1</option>
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
        {generatedPreviewUrl && (
          <div className="rounded-3xl border border-theme-dark bg-theme-black/40 p-6">
            <audio
              src={generatedPreviewUrl}
              controls
              className="w-full"
              style={{ borderRadius: "12px", height: "46px" }}
            />
          </div>
        )}
      </div>
    </div>
  );

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
