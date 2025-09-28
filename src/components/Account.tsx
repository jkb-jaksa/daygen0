import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { Upload, X, CheckCircle2, Lock } from "lucide-react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import ProfileCropModal from "./ProfileCropModal";
import { getPersistedValue, migrateKeyToIndexedDb } from "../lib/clientStorage";
import { buttons, glass, inputs } from "../styles/designSystem";
import { debugError, debugLog } from "../utils/debug";
import GoogleLogin from "./GoogleLogin";
import { useEmailAuthForm } from "../hooks/useEmailAuthForm";
import { describePath, safeNext } from "../utils/navigation";

type GalleryItem = { url: string; prompt: string; model: string; timestamp: string; ownerId?: string };

type AccountAuthScreenProps = {
  nextPath?: string | null;
  destinationLabel: string;
};

function AccountAuthScreen({ nextPath, destinationLabel }: AccountAuthScreenProps) {
  const { mode, setMode, email, setEmail, name, setName, isSubmitting, error, handleSubmit } = useEmailAuthForm({
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
    return "Sign in with our password-free demo account to sync your prompts, credits, and creative preferences on this device.";
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
        title: "Private demo login",
        description:
          "No real credentials required. Everything lives locally on this device so you can prototype safely before production auth arrives.",
      },
    ],
    [destinationCopy],
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-d-black-subtle text-d-text">
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-12 px-6 pt-[calc(var(--nav-h)+2.5rem)] pb-16 lg:flex-row lg:items-stretch lg:justify-between lg:gap-20 lg:px-8">
        <section className="flex w-full flex-col justify-start gap-8 lg:max-w-xl mt-2">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-d-mid/40 bg-d-black/40 px-4 py-2 text-[0.65rem] font-raleway uppercase tracking-[0.35em] text-d-white/70">
            Login required
          </span>
          <div className="space-y-4 -mt-4">
            <h1 className="text-4xl font-light leading-tight text-d-text font-raleway sm:text-5xl">{heading}</h1>
            <p className="max-w-xl text-base font-raleway leading-relaxed text-d-white">{subheading}</p>
          </div>
          <ul className="space-y-4">
            {highlights.map((item) => (
              <li key={item.title} className="flex items-start gap-3">
                <span className="mt-1 inline-flex size-7 items-center justify-center rounded-full bg-d-white/10 text-d-text">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <div className="space-y-1">
                  <p className="font-raleway text-base font-medium text-d-text">{item.title}</p>
                  <p className="text-sm font-raleway leading-relaxed text-d-white">{item.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section className="w-full lg:max-w-md">
          <div className={`${glass.promptDark} rounded-[28px] p-8 shadow-[0_24px_80px_rgba(8,5,24,0.45)]`}>
            <div className="space-y-3 text-center">
              <h2 className="text-2xl font-raleway font-normal text-d-text">Enter the studio</h2>
              <p className="text-sm font-raleway text-d-white">Log in below to get full access to DayGen.</p>
            </div>
            <div className="mt-6 space-y-5">
              <GoogleLogin />
              <div className="flex rounded-full border border-d-dark bg-d-black/40 p-1 text-sm font-raleway">
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className={`flex-1 rounded-full px-4 py-2 transition-colors duration-200 ${mode === "login" ? "bg-d-white/10 text-d-text" : "text-d-white/70 hover:text-d-text"}`}
                >
                  Log in
                </button>
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className={`flex-1 rounded-full px-4 py-2 transition-colors duration-200 ${mode === "signup" ? "bg-d-white/10 text-d-text" : "text-d-white/70 hover:text-d-text"}`}
                >
                  Sign up
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "signup" && (
                  <div className="space-y-1">
                    <label htmlFor="auth-name" className="block text-sm font-raleway text-d-white/80">
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
                  <label htmlFor="auth-email" className="block text-sm font-raleway text-d-white/80">
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
              <p className="flex items-center justify-center gap-2 text-xs font-raleway text-d-white/60">
                <Lock className="h-3.5 w-3.5" />
                No passwords required — this mock login saves data locally for demo purposes only.
              </p>
            </div>
            <p className="mt-6 text-center text-[0.7rem] font-raleway text-d-white/50">
              By continuing you agree to our{" "}
              <Link to="/privacy-policy" className="text-d-white hover:text-d-text underline decoration-d-white/40 decoration-dotted underline-offset-4">
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
  const { user, updateProfile, logOut, storagePrefix } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [isUploadingPic, setIsUploadingPic] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
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

  const destinationLabel = useMemo(() => describePath(sanitizedNextPath), [sanitizedNextPath]);

  // Keep the input in sync if user loads after first render, but don't override user input
  useEffect(() => {
    if (user?.name && name === "") {
      setName(user.name);
    }
  }, [user?.name, name]);

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

  const handleProfilePicUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleCropComplete = async (croppedImageBlob: Blob) => {
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

      updateProfile({ profilePic: dataUrl });
    } catch (error) {
      debugError("Account - Failed to process cropped image", error);
      setUploadError("We couldn't process that image. Please try again.");
    } finally {
      setIsUploadingPic(false);
    }
  };

  const handleRemoveProfilePic = () => {
    updateProfile({ profilePic: undefined });
    setUploadError(null);
    releasePreview();
    resetFileInput();
  };

  const trimmedName = useMemo(() => (name ?? "").trim(), [name]);
  const currentUserName = useMemo(() => (user?.name ?? "").trim(), [user?.name]);
  const isNameValid = trimmedName.length > 0 && trimmedName.length <= 60;
  const isNameChanged = trimmedName !== currentUserName;
  const canSaveProfile = isNameValid && isNameChanged;
  const nameErrorMessage = trimmedName.length === 0 ? "Display name is required." : "Display name must be 60 characters or fewer.";

  useEffect(() => {
    if (!showSaved) return undefined;
    const timeout = setTimeout(() => setShowSaved(false), 3000);
    return () => clearTimeout(timeout);
  }, [showSaved]);

  const handleSaveProfile = () => {
    setNameTouched(true);

    if (!isNameValid) {
      setSaveError(nameErrorMessage);
      return;
    }

    if (!isNameChanged) {
      return;
    }

    updateProfile({ name: trimmedName });

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
      setSaveError(null);
      setShowSaved(true);
    }
  };

  // Don't auto-redirect when user clicks "My account" - let them see the account page
  // The next parameter will be used when they explicitly choose to return

  if (!user) {
    return <AccountAuthScreen nextPath={sanitizedNextPath ?? undefined} destinationLabel={destinationLabel} />;
  }

  // Show return button when there's a next parameter
  const showReturnButton = user && normalizedRawNext && decodedNextPath;

  return (
    <main className="min-h-screen text-d-text px-6 lg:px-8 pt-[calc(var(--nav-h)+0.5rem)] pb-8">
      <header className="max-w-5xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {showReturnButton && (
              <button
                onClick={() => {
                  const target = safeNext(decodedNextPath);
                  navigate(target, { replace: true });
                }}
                className="px-4 py-2 bg-d-primary text-d-black rounded-lg hover:bg-d-primary/90 transition-colors font-raleway text-sm"
              >
                Return to {destinationLabel}
              </button>
            )}
          </div>
          <button
            onClick={() => navigate(sanitizedNextPath ?? "/create")}
            className="p-2 hover:bg-d-dark/50 rounded-lg transition-colors group"
            title="Close account"
          >
            <X className="w-5 h-5 text-d-white group-hover:text-d-text transition-colors rounded-full" />
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleProfilePicUpload}
          className="hidden"
        />
      </header>

      <section className="max-w-5xl mx-auto grid gap-8 md:grid-cols-2">
        <div className={`${glass.surface} p-5`}>
          <h3 className="text-lg font-raleway mb-3 text-d-text">Profile</h3>

          <div className="mb-4">
            <label className="block text-sm text-d-white mb-2 font-raleway">Picture</label>
            <div className="flex items-center gap-3">
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                {user.profilePic ? (
                  <img
                    src={user.profilePic}
                    alt="Profile"
                    className="size-12 rounded-full object-cover border-2 border-d-dark group-hover:opacity-80 transition-opacity"
                  />
                ) : (
                  <div
                    className="size-12 rounded-full flex items-center justify-center text-d-text text-lg font-bold font-raleway border-2 border-d-dark group-hover:opacity-80 transition-opacity"
                    style={{ background: user.color || "var(--d-text)" }}
                  >
                    {(user.name || user.email)[0]?.toUpperCase()}
                  </div>
                )}
                <div className="absolute inset-0 bg-d-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                  <Upload className="size-4 text-d-text" />
                </div>
                {isUploadingPic && (
                  <div className="absolute inset-0 bg-d-black/70 rounded-full flex items-center justify-center">
                    <div className="text-d-text text-xs font-raleway">Uploading...</div>
                  </div>
                )}
              </div>
              {user.profilePic && (
                <button
                  onClick={handleRemoveProfilePic}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors duration-200 ${glass.prompt} text-d-white border-d-dark hover:border-d-text hover:text-d-text font-raleway text-sm`}
                >
                  <X className="w-4 h-4 rounded-full" />
                  Remove
                </button>
              )}
            </div>
            {uploadError && <p className="mt-2 text-xs font-raleway text-red-400">{uploadError}</p>}
          </div>

          <label className="block text-sm text-d-white mb-1 font-raleway">Display name</label>
          <input
            className={inputs.base}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (!nameTouched) {
                setNameTouched(true);
              }
              if (saveError) {
                setSaveError(null);
              }
              if (showSaved) {
                setShowSaved(false);
              }
            }}
            onBlur={() => setNameTouched(true)}
            placeholder="Enter your display name"
          />
          {(saveError || (nameTouched && !isNameValid)) && (
            <p className="mt-1 text-xs font-raleway text-red-400">{saveError ?? nameErrorMessage}</p>
          )}
          <div className="flex gap-2 mt-3 items-center">
            <button
              className={buttons.ghost}
              onClick={() => {
                logOut();
                navigate("/");
              }}
            >
              Log out
            </button>
            <button
              className={buttons.primary}
              onClick={handleSaveProfile}
              disabled={!canSaveProfile}
            >
              Save
            </button>
            {showSaved && !normalizedRawNext && (
              <span className="text-xs font-raleway text-emerald-300">Saved</span>
            )}
          </div>
        </div>

        <div className={`${glass.surface} p-5`}>
          <h3 className="text-lg font-raleway mb-3 text-d-text">At a glance</h3>
          <ul className="text-sm font-raleway text-d-white space-y-1">
            <li>
              Generated images: <strong>{gallery.length}</strong>
            </li>
          </ul>
        </div>
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
