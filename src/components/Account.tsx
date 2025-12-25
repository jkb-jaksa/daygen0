import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useAuth } from "../auth/useAuth";
import { X } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ProfileCropModal from "./ProfileCropModal";
import { getPersistedValue, migrateKeyToIndexedDb } from "../lib/clientStorage";
import { debugError, debugLog } from "../utils/debug";
import { getDestinationLabel, safeResolveNext, consumePendingAuthRedirect } from "../utils/navigation";
import { ProfileCard } from "./account/ProfileCard";
import { AtAGlance } from "./account/AtAGlance";
import { PaymentHistory } from "./account/PaymentHistory";
import { useToast } from "../hooks/useToast";

import AuthModal from "./AuthModal";

type GalleryItem = { url: string; prompt: string; model: string; timestamp: string; ownerId?: string };

type AccountAuthScreenProps = {
  nextPath?: string | null;
};

function AccountAuthScreen({ nextPath }: AccountAuthScreenProps) {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(true);
  const closeReasonRef = useRef<"auth" | null>(null);

  const defaultMode = nextPath ? "login" : "signup";

  const handleAuthenticated = useCallback(() => {
    closeReasonRef.current = "auth";
  }, []);

  const handleClose = useCallback(() => {
    setIsModalOpen(false);

    if (closeReasonRef.current === "auth") {
      closeReasonRef.current = null;
      return;
    }

    navigate("/", { replace: true });
  }, [navigate]);

  useEffect(() => {
    setIsModalOpen(true);
    closeReasonRef.current = null;
  }, [nextPath]);

  return (
    <main className="min-h-screen bg-theme-black-subtle">
      <AuthModal
        open={isModalOpen}
        onClose={handleClose}
        defaultMode={defaultMode}
        onAuthenticated={handleAuthenticated}
      />
    </main>
  );
}

export default function Account() {
  const { user, updateProfile, uploadProfilePicture, removeProfilePicture, logOut, storagePrefix, isLoading } = useAuth();
  const { showToast } = useToast();
  const [username, setUsername] = useState(user?.username ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [country, setCountry] = useState<string | null>(user?.country ?? null);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [isUploadingPic, setIsUploadingPic] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [bioTouched, setBioTouched] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawNext = searchParams.get("next");
  const [storedNextPath, setStoredNextPath] = useState<string | null>(null);

  useEffect(() => {
    if (rawNext) {
      setStoredNextPath(null);
      return;
    }
    const stored = consumePendingAuthRedirect();
    if (stored) {
      setStoredNextPath(stored);
    }
  }, [rawNext]);

  const effectiveNextSource = rawNext ?? storedNextPath ?? "/app";

  const sanitizedNextPath = useMemo(
    () => safeResolveNext(effectiveNextSource),
    [effectiveNextSource],
  );

  const destinationLabel = useMemo(
    () => getDestinationLabel(sanitizedNextPath),
    [sanitizedNextPath],
  );

  // Track if we've done the initial sync
  const initialSyncDoneRef = useRef(false);

  useEffect(() => {
    // Only update username if it hasn't been touched yet
    if (user?.username && username === "" && !usernameTouched) {
      setUsername(user.username);
    }
    // Only update bio if it hasn't been touched yet
    if (user?.bio && bio === "" && !bioTouched) {
      setBio(user.bio);
    }
    // Sync country from user ONLY on initial load (when user first becomes available)
    // After that, local state is the source of truth until save
    if (!initialSyncDoneRef.current && user) {
      initialSyncDoneRef.current = true;
      if (user.country) {
        setCountry(user.country);
      }
    }
  }, [username, bio, user, user?.username, user?.bio, user?.country, usernameTouched, bioTouched]);

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

        // Extract mime type from data URL
        const mimeType = dataUrl.match(/^data:([^;]+);/)?.[1] || 'image/png';

        await uploadProfilePicture(dataUrl, mimeType);
        showToast("Profile photo updated");
      } catch (error) {
        debugError("Account - Failed to process cropped image", error);
        setUploadError("We couldn't read that image. Re-upload or use a different format.");
      } finally {
        setIsUploadingPic(false);
      }
    },
    [showToast, uploadProfilePicture],
  );

  const handleRemoveProfilePic = useCallback(async () => {
    try {
      await removeProfilePicture();
      setUploadError(null);
      showToast("Profile photo removed");
    } catch (error) {
      debugError("Account - Failed to remove profile image", error);
      setUploadError("We could not remove that image. Please try again.");
    } finally {
      releasePreview();
      resetFileInput();
    }
  }, [releasePreview, resetFileInput, showToast, removeProfilePicture]);

  const trimmedUsername = useMemo(() => (username ?? "").trim().toLowerCase(), [username]);
  const trimmedBio = useMemo(() => (bio ?? "").trim(), [bio]);
  const currentUsername = useMemo(() => (user?.username ?? "").trim(), [user?.username]);
  const currentUserBio = useMemo(() => (user?.bio ?? "").trim(), [user?.bio]);
  const currentCountry = useMemo(() => user?.country ?? null, [user?.country]);

  const isUsernameValid = trimmedUsername.length >= 3 && trimmedUsername.length <= 30 && /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(trimmedUsername);
  const isBioValid = trimmedBio.length <= 200;

  const isUsernameChanged = trimmedUsername !== currentUsername;
  const isBioChanged = trimmedBio !== currentUserBio;
  const isCountryChanged = country !== currentCountry;
  const isFormChanged = isUsernameChanged || isBioChanged || isCountryChanged;

  const canSaveProfile = isUsernameValid && isBioValid && !isSavingProfile;
  const usernameErrorMessage = trimmedUsername.length < 3
    ? "Profile URL must be at least 3 characters."
    : trimmedUsername.length > 30
      ? "Profile URL must be 30 characters or fewer."
      : "Must use only lowercase letters, numbers, and hyphens.";
  const bioErrorMessage = "Bio must be 200 characters or fewer.";


  const handleUsernameChange = useCallback(
    (value: string) => {
      setUsername(value);
      if (!usernameTouched) {
        setUsernameTouched(true);
      }
      if (saveError) {
        setSaveError(null);
      }
    },
    [usernameTouched, saveError],
  );

  const handleUsernameBlur = useCallback(() => {
    setUsernameTouched(true);
  }, []);

  const handleBioChange = useCallback(
    (value: string) => {
      setBio(value);
      if (!bioTouched) {
        setBioTouched(true);
      }
      if (saveError) {
        setSaveError(null);
      }
    },
    [bioTouched, saveError],
  );

  const handleBioBlur = useCallback(() => {
    setBioTouched(true);
  }, []);

  const handleCountryChange = useCallback((value: string | null) => {
    setCountry(value);
    if (saveError) {
      setSaveError(null);
    }
  }, [saveError]);

  const handleBack = useCallback(() => {
    // Navigate to app (or next path) to close the account section
    navigate(sanitizedNextPath ?? "/app", { replace: true });
  }, [navigate, sanitizedNextPath]);

  const handleSaveProfile = useCallback(async () => {
    setUsernameTouched(true);
    setBioTouched(true);

    if (!isUsernameValid) {
      setSaveError(usernameErrorMessage);
      return;
    }

    if (!isBioValid) {
      setSaveError(bioErrorMessage);
      return;
    }

    if (!isFormChanged) {
      // Just close the section when there are no changes
      handleBack();
      return;
    }

    setIsSavingProfile(true);

    try {
      await updateProfile({
        username: trimmedUsername,
        bio: trimmedBio,
        country: country,
      });
      setSaveError(null);
      // Reset touched states after successful save
      setUsernameTouched(false);
      setBioTouched(false);

      // Close the section after successful save
      if (sanitizedNextPath && sanitizedNextPath !== "/app") {
        debugLog("Account - redirecting after profile save to:", sanitizedNextPath);
        navigate(sanitizedNextPath, { replace: true });
      } else {
        handleBack();
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
    isFormChanged,
    isUsernameValid,
    isBioValid,
    usernameErrorMessage,
    bioErrorMessage,
    navigate,
    sanitizedNextPath,
    handleBack,
    trimmedUsername,
    trimmedBio,
    country,
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
    return <AccountAuthScreen nextPath={sanitizedNextPath ?? undefined} />;
  }

  // Show return button when there's a next parameter
  const showReturnButton = user && sanitizedNextPath && sanitizedNextPath !== "/app";

  return (
    <main className="min-h-screen text-theme-text px-4 sm:px-6 lg:px-8 pt-[calc(var(--nav-h,4rem)+16px)] pb-8">
      <header className="max-w-5xl mx-auto mb-6 sm:mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {showReturnButton && (
              <button
                onClick={handleBack}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-theme-primary text-theme-black rounded-lg hover:bg-theme-primary/90 transition-colors font-raleway text-xs sm:text-sm"
              >
                Return to {destinationLabel}
              </button>
            )}
          </div>
          <button
            onClick={handleBack}
            className="p-2 hover:bg-theme-dark/50 rounded-lg transition-colors group"
            title="Close account"
          >
            <X className="w-5 h-5 text-theme-white group-hover:text-theme-text transition-colors rounded-full" />
          </button>
        </div>
      </header>

      <section className="max-w-5xl mx-auto grid gap-6 sm:gap-8 md:grid-cols-2">
        <ProfileCard
          user={user}
          username={username}
          usernameTouched={usernameTouched}
          isUsernameValid={isUsernameValid}
          usernameErrorMessage={usernameErrorMessage}
          bio={bio}
          bioTouched={bioTouched}
          isBioValid={isBioValid}
          bioErrorMessage={bioErrorMessage}
          saveError={saveError}
          canSaveProfile={canSaveProfile}
          isSavingProfile={isSavingProfile}
          isUploadingPic={isUploadingPic}
          uploadError={uploadError}
          fileInputRef={fileInputRef}
          onProfilePicChange={handleProfilePicUpload}
          onRemoveProfilePic={handleRemoveProfilePic}
          onUsernameChange={handleUsernameChange}
          onUsernameBlur={handleUsernameBlur}
          onBioChange={handleBioChange}
          onBioBlur={handleBioBlur}
          country={country}
          onCountryChange={handleCountryChange}
          onSaveProfile={handleProfileSubmit}
          onLogOut={handleLogOut}
        />

        <AtAGlance
          generatedCount={gallery.length}
        />
      </section>

      {/* Payment History */}
      <section className="max-w-5xl mx-auto mt-8">
        <PaymentHistory />
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
