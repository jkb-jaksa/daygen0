import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { buttons } from "../../../styles/designSystem";
import {
  Mic,
  PenTool,
  Sparkles,
  Loader2,
  Download,
  Play,
  Pause,
} from "lucide-react";
import { useToast } from "../../../hooks/useToast";
import {
  cloneElevenLabsVoice,
  generateElevenLabsSpeech,
  createProfessionalVoice,
  verifyProfessionalVoice,
  uploadRecordedVoice,
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

const MAX_RECORDING_MINUTES = 30;

const formatDuration = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")
    } `;
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
  const [mode, setMode] = useState<VoiceFlowMode>("design");
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
  const [script, setScript] = useState("");
  const [modelId, setModelId] = useState("eleven_multilingual_v2");
  const [voiceName, setVoiceName] = useState("My Digital Voice");
  const voiceDescription = "Digital copy voice sample";
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

  const cloneVoiceFromSource = useCallback(
    async (file: File | Blob, source: "upload" | "record") => {
      setIsSavingRecordingClone(true);
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
        setIsSavingRecordingClone(false);
      }
    },
    [showToast, voiceDescription, voiceName],
  );

  const handleRecordingClone = useCallback(() => {
    if (!recordingState.blob) {
      setCloneError("Record a clip before saving it to ElevenLabs.");
      return;
    }
    const recordingFile = new File(
      [recordingState.blob],
      `recording - ${Date.now()}.webm`,
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
        `sample - ${Date.now()}.webm`,
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
        `verification - ${Date.now()}.webm`,
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
        console.log(`Variation ${index} received: `, {
          contentType: result.contentType,
          base64Length: result.audioBase64?.length,
          base64Prefix: result.audioBase64?.substring(0, 50)
        });

        const blob = base64ToBlob(result.audioBase64, result.contentType);
        return {
          id: `var-${Date.now()} -${index} `,
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
    a.download = `generated - voice - ${Date.now()}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };



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

        // Auto-download the recording to user's device
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `daygen - recording - ${timestamp}.webm`;
        const downloadLink = document.createElement("a");
        downloadLink.href = objectUrl;
        downloadLink.download = filename;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        // Upload to R2 storage (fire and forget, show toast on completion)
        const file = new File([blob], filename, {
          type: mediaRecorder.mimeType || "audio/webm",
        });
        console.log("Uploading recording to R2:", {
          filename,
          size: blob.size,
          type: mediaRecorder.mimeType || "audio/webm",
        });
        uploadRecordedVoice(file, filename)
          .then((result) => {
            console.log("R2 upload successful:", result);
            showToast("Recording saved to cloud storage.");
          })
          .catch((err) => {
            console.error("Failed to upload recording to R2:", err);
            showToast("Recording downloaded, but cloud upload failed.");
          });
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
              error: `Recording limit reached(${MAX_RECORDING_MINUTES} minutes).`,
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
  }, [recordingState.audioUrl, stopRecording, showToast]);

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
              className={`size - 2 rounded - full ${recordingState.isRecording ? "animate-pulse bg-red-500" : "bg-theme-white/50"
                } `}
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
                className={`${buttons.secondary} inline - flex items - center gap - 2`}
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
                className={`${buttons.pillWarm} inline - flex items - center gap - 2`}
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
                  <img src={`data: image / png; base64, ${pvcCaptcha} `} alt="Verification Captcha" className="max-h-32" />
                </div>
              )}

              <div className="flex flex-col items-center gap-4 pt-4">
                <div className="flex items-center gap-3 rounded-full border border-theme-dark bg-theme-black/50 px-4 py-2 text-sm font-raleway text-theme-text">
                  <span
                    className={`size - 2 rounded - full ${recordingState.isRecording ? "animate-pulse bg-red-500" : "bg-theme-white/50"
                      } `}
                  />
                  <span>{recordingStatusLabel}</span>
                </div>

                {!recordingState.isRecording && !recordingState.audioUrl && (
                  <button
                    className={`${buttons.primary} inline - flex items - center gap - 2`}
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
                      className={`${buttons.secondary} inline - flex items - center gap - 2`}
                      onClick={() => {
                        setRecordingState(prev => ({ ...prev, audioUrl: null, blob: null }));
                      }}
                    >
                      Re-record
                    </button>
                    <button
                      className={`${buttons.pillWarm} inline - flex items - center gap - 2`}
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
              className={`${buttons.secondary} mt - 4`}
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
              className={`${buttons.pillWarm} inline - flex items - center gap - 2`}
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
      <div className="flex flex-col gap-4">
        <header className="text-center">
          <h2 className="text-2xl font-raleway text-theme-text">
            Create your voice
          </h2>
        </header>

        {/* Main content grid: Record | Script | Professional Clone */}
        <div className="grid gap-4 md:grid-cols-[200px_2fr_200px]">
          {/* Record Section - Left */}
          <div className="rounded-3xl border border-theme-dark bg-theme-black/40 p-4">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="grid size-14 place-items-center rounded-full border border-white/10 bg-theme-black/40">
                <Mic className="size-6 text-cyan-300" />
              </div>
              <h3 className="text-lg font-raleway text-theme-text">Record Voice</h3>
              <p className="text-xs font-raleway text-theme-white/60">
                Record up to {MAX_RECORDING_MINUTES} min per session
              </p>

              {/* Recording status */}
              <div className="flex items-center gap-2 rounded-full border border-theme-dark bg-theme-black/50 px-3 py-1 text-xs font-raleway text-theme-text">
                <span
                  className={`size - 2 rounded - full ${recordingState.isRecording ? "animate-pulse bg-red-500" : "bg-theme-white/50"} `}
                />
                <span>{formatDuration(recordingState.durationMs)}</span>
              </div>

              {/* Recording controls */}
              {!recordingState.isRecording && !recordingState.audioUrl && (
                <button
                  className={`${buttons.primary} inline - flex items - center gap - 2`}
                  onClick={startRecording}
                >
                  <Mic className="size-4" />
                  Start Recording
                </button>
              )}

              {recordingState.isRecording && (
                <button
                  className="inline-flex items-center gap-2 rounded-full bg-red-500 px-6 py-3 text-sm font-raleway text-white transition-colors duration-200 hover:bg-red-600"
                  onClick={() => stopRecording()}
                >
                  <SquareIcon />
                  Stop
                </button>
              )}

              {recordingState.audioUrl && (
                <div className="w-full space-y-3">
                  <audio
                    src={recordingState.audioUrl}
                    controls
                    className="w-full"
                    style={{ borderRadius: "12px", height: "40px" }}
                  />
                  <button
                    className={`${buttons.secondary} w - full inline - flex items - center justify - center gap - 2 text - sm`}
                    onClick={() => {
                      if (recordingState.audioUrl) {
                        URL.revokeObjectURL(recordingState.audioUrl);
                      }
                      setRecordingState({
                        isRecording: false,
                        durationMs: 0,
                        audioUrl: null,
                        blob: null,
                        error: null,
                      });
                    }}
                  >
                    Clear & Record Again
                  </button>
                </div>
              )}

              {recordingState.error && (
                <p className="text-xs font-raleway text-red-400">
                  {recordingState.error}
                </p>
              )}
            </div>
          </div>

          {/* Script Section - Center */}
          <div className="space-y-4">
            <textarea
              ref={scriptInputRef}
              value={script}
              onChange={(event) => setScript(event.target.value)}
              className="h-72 w-full resize-none rounded-2xl border border-theme-dark bg-theme-black/60 px-4 py-3 text-sm text-theme-white focus:border-theme-text focus:outline-none focus:ring-0"
              placeholder="Write the words you would like your voice to speak…"
            />
          </div>

          {/* Professional Voice Clone Section - Right */}
          <div className="rounded-3xl border border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-4">
            <div className="flex flex-col items-center gap-4 text-center h-full justify-center">
              <div className="grid size-14 place-items-center rounded-full border border-purple-500/30 bg-theme-black/40">
                <Sparkles className="size-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-raleway text-theme-text">Professional Clone</h3>
              <p className="text-xs font-raleway text-theme-white/60">
                Requires 30+ minutes of audio for best results
              </p>
              <button
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 text-sm font-raleway font-medium text-white transition-all hover:opacity-90"
                onClick={() => setMode("pvc")}
              >
                <Sparkles className="size-4" />
                Create Clone
              </button>
            </div>
          </div>
        </div>

        {/* Voice Settings Row */}
        <div className="grid gap-4 md:grid-cols-4">
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

        {/* Generate Actions */}
        <div className="flex justify-center">
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
        {designError && (
          <p className="text-center text-sm font-raleway text-red-400">
            {designError}
          </p>
        )}

        {/* Generated Samples */}
        {variations.length > 0 && (
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              {variations.map((variation, index) => (
                <div
                  key={variation.id}
                  className="flex items-center gap-3 rounded-3xl border border-theme-dark bg-theme-black/40 p-4 hover:border-theme-white/20 transition-all"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlayVariation(variation.id);
                    }}
                    className="grid size-12 shrink-0 place-items-center rounded-full bg-theme-white text-theme-black transition-colors hover:bg-theme-white/90"
                  >
                    {playingVariationId === variation.id ? (
                      <Pause className="size-5 fill-current" />
                    ) : (
                      <Play className="size-5 fill-current ml-0.5" />
                    )}
                  </button>

                  <div className="flex-1 space-y-1">
                    <span className="block text-xs font-raleway font-medium text-theme-white/60">
                      Sample {index + 1}
                    </span>
                    <div className="h-8 flex items-center">
                      <div className="flex gap-0.5 items-center h-full">
                        {Array.from({ length: 40 }).map((_, i) => (
                          <div
                            key={i}
                            className="w-0.5 bg-theme-white/40 rounded-full"
                            style={{ height: `${Math.random() * 60 + 20}%` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Share functionality placeholder
                    }}
                    className="grid size-9 shrink-0 place-items-center rounded-full bg-theme-white/10 text-theme-white transition-colors hover:bg-theme-white/20"
                  >
                    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedVariationId(variation.id);
                      handleDownload();
                    }}
                    className="grid size-9 shrink-0 place-items-center rounded-full bg-theme-white/10 text-theme-white transition-colors hover:bg-theme-white/20"
                  >
                    <Download className="size-4" />
                  </button>

                  <audio
                    ref={(el) => { audioRefs.current[variation.id] = el; }}
                    src={variation.url}
                    onEnded={() => setPlayingVariationId(null)}
                    className="hidden"
                  />
                </div>
              ))}
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
          onClick={() => setMode("design")}
          className="mb-6 text-sm text-gray-400 hover:text-white flex items-center gap-2"
        >
          ← Back to Design
        </button>
        <VoiceUploader onSuccess={() => setMode("design")} />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
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
