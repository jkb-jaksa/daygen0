import { useEffect, useState, useRef, useMemo } from "react";
import { useAuth } from "../auth/AuthContext";
import { Upload, X, CheckCircle2, Lock } from "lucide-react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import ProfileCropModal from "./ProfileCropModal";
import { getPersistedValue, migrateKeyToIndexedDb } from "../lib/clientStorage";
import { buttons, glass, inputs } from "../styles/designSystem";
import { debugError, debugLog } from "../utils/debug";
import GoogleLogin from "./GoogleLogin";

type GalleryItem = { url: string; prompt: string; model: string; timestamp: string; ownerId?: string };

type AccountAuthScreenProps = {
  nextPath?: string | null;
  destinationLabel: string;
};

function AccountAuthScreen({ nextPath, destinationLabel }: AccountAuthScreenProps) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">(nextPath ? "login" : "signup");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  }, [nextPath, destinationCopy]);

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

  useEffect(() => {
    setError(null);
  }, [mode]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Enter your email to continue.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (mode === "login") {
        await signIn(trimmedEmail);
      } else {
        await signUp(trimmedEmail, name.trim() || undefined);
      }
    } catch (err) {
      debugError("AccountAuthScreen - failed to authenticate", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
                {error && <p className="text-xs font-raleway text-red-400">{error}</p>}
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
              By continuing you agree to our {" "}
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
  const [imageToCrop, setImageToCrop] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawNext = searchParams.get("next");
  const decodedNextPath = useMemo(() => {
    if (!rawNext) return null;
    try {
      return decodeURIComponent(rawNext);
    } catch {
      return null;
    }
  }, [rawNext]);

  const destinationLabel = useMemo(() => {
    if (!decodedNextPath) return "DayGen";

    const formatSegment = (segment: string) =>
      segment
        .split("-")
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");

    if (decodedNextPath.startsWith("/create")) {
      const segments = decodedNextPath.split("/").filter(Boolean);
      const category = segments[1];
      return category ? `Create → ${formatSegment(category)}` : "the Create studio";
    }
    if (decodedNextPath.startsWith("/edit")) return "the Edit workspace";
    if (decodedNextPath.startsWith("/gallery")) return "your gallery";
    if (decodedNextPath.startsWith("/learn")) return "the Learn hub";
    if (decodedNextPath.startsWith("/upgrade")) return "the Upgrade page";
    return decodedNextPath === "/account" ? "your account" : "DayGen";
  }, [decodedNextPath]);

  const hasPendingRedirect = Boolean(rawNext);

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
        await migrateKeyToIndexedDb(storagePrefix, 'gallery');
        const stored = await getPersistedValue<GalleryItem[]>(storagePrefix, 'gallery');
        if (!cancelled && Array.isArray(stored)) {
          setGallery(stored);
        }
      } catch (error) {
        debugError('Account - Error loading gallery:', error);
      }
    };

    void loadGallery();

    return () => {
      cancelled = true;
    };
  }, [storagePrefix]);


  const handleProfilePicUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    // Read file and open crop modal
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setImageToCrop(result);
        setCropModalOpen(true);
      }
    };
    reader.onerror = () => {
      alert('Failed to read image file');
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (croppedImageBlob: Blob) => {
    setIsUploadingPic(true);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        updateProfile({ profilePic: result });
        setIsUploadingPic(false);
      }
    };
    reader.onerror = () => {
      alert('Failed to process cropped image');
      setIsUploadingPic(false);
    };
    reader.readAsDataURL(croppedImageBlob);
  };

  const handleRemoveProfilePic = () => {
    updateProfile({ profilePic: undefined });
  };

  const handleSaveProfile = () => {
    const trimmed = (name ?? "").trim();
    
    if (!trimmed) {
      alert("Please enter your display name");
      return;
    }
    
    // Compare with the current user name (also trimmed for consistency)
    const currentUserName = (user?.name ?? "").trim();
    if (trimmed !== currentUserName) {
      // Only update if there are changes
      updateProfile({ name: trimmed });
    }
    
    // Always navigate to close the section, regardless of whether changes were made
    if (rawNext) {
      if (decodedNextPath) {
        navigate(decodedNextPath);
      } else {
        debugError('Failed to decode next path after saving profile:', rawNext);
        navigate('/create');
      }
    } else {
      // If no 'next' parameter, redirect to create page to close account section
      navigate('/create');
    }
  };

  // If user is authenticated and there's a next parameter, redirect them
  useEffect(() => {
    if (user && rawNext) {
      if (decodedNextPath) {
        debugLog('Account - redirecting authenticated user to:', decodedNextPath);
        navigate(decodedNextPath, { replace: true });
      } else {
        debugError('Failed to decode next path:', rawNext);
        navigate('/create', { replace: true });
      }
    }
  }, [user, rawNext, decodedNextPath, navigate]);

  if (!user) {
    return <AccountAuthScreen nextPath={decodedNextPath} destinationLabel={destinationLabel} />;
  }

  // If user is authenticated and there's a next parameter, show loading while redirecting
  if (user && rawNext) {
    return (
      <main className="min-h-screen text-d-text px-6 lg:px-8 pt-[calc(var(--nav-h)+0.5rem)] pb-8">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-2xl font-raleway mb-4 text-d-text">Redirecting...</h1>
          <p className="text-d-white font-raleway">Taking you to your destination.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen text-d-text px-6 lg:px-8 pt-[calc(var(--nav-h)+0.5rem)] pb-8">
      <header className="max-w-5xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {hasPendingRedirect && (
              <div className="text-xs text-d-text mt-1 font-raleway">
                Complete your profile to continue to {destinationLabel === 'DayGen' ? 'your destination' : destinationLabel}
              </div>
            )}
          </div>
          <button
            onClick={() => navigate('/create')}
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
          </div>

          <label className="block text-sm text-d-white mb-1 font-raleway">Display name</label>
          <input className={inputs.base} value={name} onChange={e=>setName(e.target.value)} placeholder="Enter your display name" />
          <div className="flex gap-2 mt-3">
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
            >
              Save
            </button>
          </div>
        </div>

        <div className={`${glass.surface} p-5`}>
          <h3 className="text-lg font-raleway mb-3 text-d-text">At a glance</h3>
          <ul className="text-sm font-raleway text-d-white space-y-1">
            <li>Generated images: <strong>{gallery.length}</strong></li>
          </ul>
        </div>
      </section>


      {/* Profile Crop Modal */}
      <ProfileCropModal
        isOpen={cropModalOpen}
        onClose={() => setCropModalOpen(false)}
        imageSrc={imageToCrop}
        onCropComplete={handleCropComplete}
      />

    </main>
  );
}
