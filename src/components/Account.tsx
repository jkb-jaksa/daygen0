import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useAuth } from "../auth/useAuth";
import { X, CheckCircle2, Lock, Eye, EyeOff } from "lucide-react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import ProfileCropModal from "./ProfileCropModal";
import { getPersistedValue, migrateKeyToIndexedDb } from "../lib/clientStorage";
import { buttons, glass, inputs } from "../styles/designSystem";
import { debugError, debugLog } from "../utils/debug";
import GoogleLogin from "./GoogleLogin";
import { useEmailAuthForm } from "../hooks/useEmailAuthForm";
import { getDestinationLabel, safeNext } from "../utils/navigation";
import { ProfileCard } from "./account/ProfileCard";
import { AtAGlance } from "./account/AtAGlance";
import { useToast } from "../hooks/useToast";

type GalleryItem = { url: string; prompt: string; model: string; timestamp: string; ownerId?: string };

type AccountAuthScreenProps = {
  nextPath?: string | null;
  destinationLabel: string;
};

function AccountAuthScreen({ nextPath, destinationLabel }: AccountAuthScreenProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const {
    mode,
    setMode,
    email,
    setEmail,
    name,
    setName,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    isSubmitting,
    error,
    handleSubmit,
  } = useEmailAuthForm({
    initialMode: nextPath ? "login" : "signup",
  });

  const destinationCopy = destinationLabel === "DayGen" ? "your DayGen workspace" : destinationLabel;
  const heading = useMemo(() => {
    if (nextPath?.startsWith("/edit")) return "Log in to continue editing";
    if (nextPath?.startsWith("/create")) return "Log in to start creating";
    return "Welcome back to DayGen";
  }, [nextPath]);

  const subheading = useMemo(() => {
    if (nextPath) {
      return "Unlock your daily generations. Complete the quick sign-in below to continue.";
    }
    return "Sign in with your DayGen account to sync prompts, credits, and creative preferences across devices.";
  }, [nextPath]);

  const highlights = useMemo(
    () => [
      {
        title: "Stay in the flow",
        description:
          "Pick up right where you left off. We remember your recent prompts, favorite tools, and credit balance while you explore.",
      },
      {
        title: "Instant hand-off",
        description: `The moment you're signed in, we’ll guide you straight to ${destinationCopy} so you can keep creating without friction.`,
      },
      {
        title: "Secure authentication",
        description:
          "Passwords are encrypted and verified by our backend so your creative workspace stays protected.",
      },
    ],
    [destinationCopy],
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-theme-black-subtle text-theme-text">
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-12 px-6 pt-[calc(var(--nav-h,4rem)+16px)] pb-16 lg:flex-row lg:items-stretch lg:justify-between lg:gap-20 lg:px-8">
        <section className="flex w-full flex-col justify-start gap-8 lg:max-w-xl mt-2">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-theme-mid/40 bg-theme-black/40 px-4 py-2 text-[0.65rem] font-raleway uppercase tracking-[0.35em] text-theme-white/70">
            Login required
          </span>
          <div className="space-y-4 -mt-4">
            <h1 className="text-4xl font-light leading-tight text-theme-text font-raleway sm:text-5xl">{heading}</h1>
            <p className="max-w-xl text-base font-raleway leading-relaxed text-theme-white">{subheading}</p>
          </div>
          <ul className="space-y-4">
            {highlights.map((item) => (
              <li key={item.title} className="flex items-start gap-3">
                <span className="mt-1 inline-flex size-7 items-center justify-center rounded-full bg-theme-white/10 text-theme-text">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <div className="space-y-1">
                  <p className="font-raleway text-base font-medium text-theme-text">{item.title}</p>
                  <p className="text-sm font-raleway leading-relaxed text-theme-white">{item.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section className="w-full lg:max-w-md">
          <div className={`${glass.promptDark} rounded-[28px] p-8 shadow-[0_24px_80px_rgba(8,5,24,0.45)]`}>
            <div className="space-y-3 text-center">
              <h2 className="text-2xl font-raleway font-light text-theme-text">Enter the studio</h2>
              <p className="text-sm font-raleway text-theme-white">Log in below to get full access to DayGen.</p>
            </div>
            <div className="mt-6 space-y-5">
              <GoogleLogin />
              <div className="flex rounded-full border border-theme-dark bg-theme-black/40 p-1 text-sm font-raleway">
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className={`flex-1 rounded-full px-4 py-2 transition-colors duration-200 ${mode === "login" ? "bg-theme-white/10 text-theme-text" : "text-theme-white/70 hover:text-theme-text"}`}
                >
                  Log in
                </button>
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className={`flex-1 rounded-full px-4 py-2 transition-colors duration-200 ${mode === "signup" ? "bg-theme-white/10 text-theme-text" : "text-theme-white/70 hover:text-theme-text"}`}
                >
                  Sign up
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "signup" && (
                  <div className="space-y-1">
                    <label htmlFor="auth-name" className="block text-sm font-raleway text-theme-white/80">
                      Name
                    </label>
                    <input
                      id="auth-name"
                      type="text"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className={inputs.base}
                      placeholder="How should we call you?"
                      autoComplete="name"
                      disabled={isSubmitting}
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <label htmlFor="auth-email" className="block text-sm font-raleway text-theme-white/80">
                    Email
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className={inputs.base}
                    placeholder="Enter your email"
                    autoComplete="email"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="auth-password" className="block text-sm font-raleway text-theme-white/80">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="auth-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className={inputs.base}
                      placeholder="Enter your password"
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      required
                      minLength={8}
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-white/60 hover:text-theme-text transition-colors"
                      disabled={isSubmitting}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {mode === "signup" && (
                  <div className="space-y-1">
                    <label htmlFor="auth-confirm" className="block text-sm font-raleway text-theme-white/80">
                      Confirm password
                    </label>
                    <div className="relative">
                      <input
                        id="auth-confirm"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        className={inputs.base}
                        placeholder="Re-enter your password"
                        autoComplete="new-password"
                        required
                        minLength={8}
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-white/60 hover:text-theme-text transition-colors"
                        disabled={isSubmitting}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}
                <div aria-live="polite" role="status" className="min-h-[1rem]">
                  {error && <p className="text-xs font-raleway text-red-400">{error}</p>}
                </div>
                <button
                  type="submit"
                  className={`${buttons.blockPrimary} ${isSubmitting ? "cursor-wait opacity-80" : ""}`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
                </button>
              </form>
              <p className="flex items-center justify-center gap-2 text-xs font-raleway text-theme-white/60">
                <Lock className="h-3.5 w-3.5" />
                Passwords are handled securely by the DayGen backend with JWT-based sessions.
              </p>
            </div>
            <p className="mt-6 text-center text-[0.7rem] font-raleway text-theme-white/50">
              By continuing you agree to our{" "}
              <Link to="/privacy-policy" className="text-theme-white hover:text-theme-text underline decoration-theme-white/40 decoration-dotted underline-offset-4">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function Account() {
  const { user, updateProfile, logOut, storagePrefix, isLoading } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState(user?.displayName ?? "");
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [isUploadingPic, setIsUploadingPic] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [nameTouched, setNameTouched] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawNext = searchParams.get("next");
  const normalizedRawNext = useMemo(() => rawNext?.trim() ?? null, [rawNext]);
  
  const decodedNextPath = useMemo(() => {
    if (!normalizedRawNext) return null;
    try {
      return decodeURIComponent(normalizedRawNext);
    } catch {
      return null;
    }
  }, [normalizedRawNext]);
  const sanitizedNextPath = useMemo(
    () => (normalizedRawNext ? safeNext(decodedNextPath ?? undefined) : null),
    [decodedNextPath, normalizedRawNext],
  );

  const destinationLabel = useMemo(
    () => getDestinationLabel(decodedNextPath ?? sanitizedNextPath ?? normalizedRawNext),
    [decodedNextPath, normalizedRawNext, sanitizedNextPath],
  );

  // Keep the input in sync if user loads after first render, but don't override user input
  useEffect(() => {
    if (user?.displayName && name === "") {
      setName(user.displayName);
    }
  }, [name, user?.displayName]);

  useEffect(() => {
    let cancelled = false;

    const loadGallery = async () => {
      try {
        await migrateKeyToIndexedDb(storagePrefix, "gallery");
        const stored = await getPersistedValue<GalleryItem[]>(storagePrefix, "gallery");
        if (!cancelled && Array.isArray(stored)) {
          setGallery(stored);
        }
      } catch (error) {
        debugError("Account - Error loading gallery:", error);
      }
    };

    void loadGallery();

    return () => {
      cancelled = true;
    };
  }, [storagePrefix]);

  const resetFileInput = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const releasePreview = useCallback(() => {
    setImageToCrop((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });
  }, []);

  const handleCropModalClose = useCallback(() => {
    setCropModalOpen(false);
    releasePreview();
    resetFileInput();
  }, [releasePreview, resetFileInput]);

  useEffect(() => {
    return () => {
      if (imageToCrop) {
        URL.revokeObjectURL(imageToCrop);
      }
    };
  }, [imageToCrop]);

  const handleProfilePicUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Please choose an image file.");
      resetFileInput();
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image size must be less than 5MB.");
      resetFileInput();
      return;
    }

    setUploadError(null);
    releasePreview();

    const objectUrl = URL.createObjectURL(file);
    setImageToCrop(objectUrl);
    setCropModalOpen(true);
  };

  const handleCropComplete = useCallback(
    async (croppedImageBlob: Blob) => {
      setIsUploadingPic(true);
      setUploadError(null);

      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string) ?? "");
          reader.onerror = () => reject(new Error("Failed to read cropped image"));
          reader.readAsDataURL(croppedImageBlob);
        });

      if (!dataUrl) {
        throw new Error("Empty cropped image data");
      }

        await updateProfile({ profileImage: dataUrl });
        showToast("Profile photo updated");
      } catch (error) {
        debugError("Account - Failed to process cropped image", error);
        setUploadError("We couldn’t read that image. Re-upload or use a different format.");
      } finally {
        setIsUploadingPic(false);
      }
    },
    [showToast, updateProfile],
  );

  const handleRemoveProfilePic = useCallback(async () => {
    try {
      await updateProfile({ profileImage: null });
      setUploadError(null);
      showToast("Profile photo removed");
    } catch (error) {
      debugError("Account - Failed to remove profile image", error);
      setUploadError("We could not remove that image. Please try again.");
    } finally {
      releasePreview();
      resetFileInput();
    }
  }, [releasePreview, resetFileInput, showToast, updateProfile]);

  const trimmedName = useMemo(() => (name ?? "").trim(), [name]);
  const currentUserName = useMemo(() => (user?.displayName ?? "").trim(), [user?.displayName]);
  const isNameValid = trimmedName.length > 0 && trimmedName.length <= 60;
  const isNameChanged = trimmedName !== currentUserName;
  const canSaveProfile = isNameValid && !isSavingProfile;
  const nameErrorMessage = trimmedName.length === 0 ? "Display name is required." : "Display name must be 60 characters or fewer.";

  const handleNameChange = useCallback(
    (value: string) => {
      setName(value);
      if (!nameTouched) {
        setNameTouched(true);
      }
      if (saveError) {
        setSaveError(null);
      }
    },
    [nameTouched, saveError],
  );

  const handleNameBlur = useCallback(() => {
    setNameTouched(true);
  }, []);

  const handleSaveProfile = useCallback(async () => {
    setNameTouched(true);

    if (!isNameValid) {
      setSaveError(nameErrorMessage);
      return;
    }

    if (!isNameChanged) {
      showToast("Profile saved");
      return;
    }

    setIsSavingProfile(true);

    try {
      await updateProfile({ displayName: trimmedName });
      setSaveError(null);

      if (normalizedRawNext) {
        if (decodedNextPath) {
          const target = safeNext(decodedNextPath);
          debugLog("Account - redirecting after profile save to:", target);
          navigate(target, { replace: true });
        } else {
          debugError("Failed to decode next path after saving profile:", normalizedRawNext);
          navigate("/create", { replace: true });
        }
      } else {
        showToast("Profile saved");
      }
    } catch (error) {
      debugError("Account - Failed to save profile", error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : "We could not save your changes. Please try again.";
      setSaveError(message);
    } finally {
      setIsSavingProfile(false);
    }
  }, [
    decodedNextPath,
    isNameChanged,
    isNameValid,
    nameErrorMessage,
    navigate,
    normalizedRawNext,
    showToast,
    trimmedName,
    updateProfile,
  ]);

  const handleLogOut = useCallback(() => {
    logOut();
    navigate("/");
  }, [logOut, navigate]);

  const handleProfileSubmit = useCallback(() => {
    void handleSaveProfile();
  }, [handleSaveProfile]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-theme-black-subtle text-theme-text">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-theme-white/30 border-t-theme-white" aria-hidden="true" />
          <p className="font-raleway text-sm text-theme-white/70">Restoring your account...</p>
        </div>
      </main>
    );
  }

  // Don't auto-redirect when user clicks "My account" - let them see the account page
  // The next parameter will be used when they explicitly choose to return

  if (!user) {
    return <AccountAuthScreen nextPath={sanitizedNextPath ?? undefined} destinationLabel={destinationLabel} />;
  }

  // Show return button when there's a next parameter
  const showReturnButton = user && normalizedRawNext && decodedNextPath;

  return (
    <main className="min-h-screen text-theme-text px-6 lg:px-8 pt-[calc(var(--nav-h,4rem)+16px)] pb-8">
      <header className="max-w-5xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {showReturnButton && (
              <button
                onClick={() => {
                  const target = safeNext(decodedNextPath);
                  navigate(target, { replace: true });
                }}
                className="px-4 py-2 bg-theme-primary text-theme-black rounded-lg hover:bg-theme-primary/90 transition-colors font-raleway text-sm"
              >
                Return to {destinationLabel}
              </button>
            )}
          </div>
          <button
            onClick={() => navigate(sanitizedNextPath ?? "/create")}
            className="p-2 hover:bg-theme-dark/50 rounded-lg transition-colors group"
            title="Close account"
          >
            <X className="w-5 h-5 text-theme-white group-hover:text-theme-text transition-colors rounded-full" />
          </button>
        </div>
      </header>

      <section className="max-w-5xl mx-auto grid gap-8 md:grid-cols-2">
        <ProfileCard
          user={user}
          name={name}
          nameTouched={nameTouched}
          isNameValid={isNameValid}
          nameErrorMessage={nameErrorMessage}
          saveError={saveError}
          canSaveProfile={canSaveProfile}
          isSavingProfile={isSavingProfile}
          isUploadingPic={isUploadingPic}
          uploadError={uploadError}
          fileInputRef={fileInputRef}
          onProfilePicChange={handleProfilePicUpload}
          onRemoveProfilePic={handleRemoveProfilePic}
          onNameChange={handleNameChange}
          onNameBlur={handleNameBlur}
          onSaveProfile={handleProfileSubmit}
          onLogOut={handleLogOut}
        />

        <AtAGlance generatedCount={gallery.length} creditsRemaining={user.credits} />
      </section>

      <ProfileCropModal
        isOpen={cropModalOpen && Boolean(imageToCrop)}
        onClose={handleCropModalClose}
        imageSrc={imageToCrop ?? ""}
        onCropComplete={handleCropComplete}
      />
    </main>
  );
}
