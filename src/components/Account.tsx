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
import { useToast } from "../hooks/useToast";
import SubscriptionManager from "./payments/SubscriptionManager";
import { WalletBalanceCard } from "./payments/WalletBalanceCard";
import { usePayments, type WalletBalance } from "../hooks/usePayments";
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
  const { getWalletBalance } = usePayments();
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [name, setName] = useState(user?.displayName ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [isUploadingPic, setIsUploadingPic] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [nameTouched, setNameTouched] = useState(false);
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

  // Keep the input in sync if user loads after first render, but don't override user input
  useEffect(() => {
    if (user?.displayName && name === "") {
      setName(user.displayName);
    }
    // Only update username if it hasn't been touched yet
    if (user?.username && username === "" && !usernameTouched) {
      setUsername(user.username);
    }
    // Only update bio if it hasn't been touched yet
    if (user?.bio && bio === "" && !bioTouched) {
      setBio(user.bio);
    }
  }, [name, username, bio, user?.displayName, user?.username, user?.bio, usernameTouched, bioTouched]);

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

  // Fetch wallet balance when user is available
  useEffect(() => {
    if (!user) {
      setWalletBalance(null);
      return;
    }
    getWalletBalance()
      .then(setWalletBalance)
      .catch((err) => debugError("Account - Error loading wallet balance:", err));
  }, [user, getWalletBalance]);

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

  const trimmedName = useMemo(() => (name ?? "").trim(), [name]);
  const trimmedUsername = useMemo(() => (username ?? "").trim().toLowerCase(), [username]);
  const trimmedBio = useMemo(() => (bio ?? "").trim(), [bio]);
  const currentUserName = useMemo(() => (user?.displayName ?? "").trim(), [user?.displayName]);
  const currentUsername = useMemo(() => (user?.username ?? "").trim(), [user?.username]);
  const currentUserBio = useMemo(() => (user?.bio ?? "").trim(), [user?.bio]);

  const isNameValid = trimmedName.length > 0 && trimmedName.length <= 60;
  const isUsernameValid = trimmedUsername.length >= 3 && trimmedUsername.length <= 30 && /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(trimmedUsername);
  const isBioValid = trimmedBio.length <= 500;

  const isNameChanged = trimmedName !== currentUserName;
  const isUsernameChanged = trimmedUsername !== currentUsername;
  const isBioChanged = trimmedBio !== currentUserBio;
  const isFormChanged = isNameChanged || isUsernameChanged || isBioChanged;

  const canSaveProfile = isNameValid && isUsernameValid && isBioValid && !isSavingProfile;
  const nameErrorMessage = trimmedName.length === 0 ? "User name is required." : "User name must be 60 characters or fewer.";
  const usernameErrorMessage = trimmedUsername.length < 3
    ? "Profile URL must be at least 3 characters."
    : trimmedUsername.length > 30
      ? "Profile URL must be 30 characters or fewer."
      : "Must use only lowercase letters, numbers, and hyphens.";
  const bioErrorMessage = "Bio must be 500 characters or fewer.";

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

  const handleSaveProfile = useCallback(async () => {
    setNameTouched(true);
    setBioTouched(true);

    if (!isNameValid) {
      setSaveError(nameErrorMessage);
      return;
    }

    if (!isBioValid) {
      setSaveError(bioErrorMessage);
      return;
    }

    if (!isFormChanged) {
      showToast("Profile saved");
      return;
    }

    setIsSavingProfile(true);

    try {
      await updateProfile({
        displayName: trimmedName,
        username: trimmedUsername,
        bio: trimmedBio
      });
      setSaveError(null);

      if (sanitizedNextPath && sanitizedNextPath !== "/app") {
        debugLog("Account - redirecting after profile save to:", sanitizedNextPath);
        navigate(sanitizedNextPath, { replace: true });
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
    isFormChanged,
    isNameValid,
    isUsernameValid,
    isBioValid,
    nameErrorMessage,
    usernameErrorMessage,
    bioErrorMessage,
    navigate,
    sanitizedNextPath,
    showToast,
    trimmedName,
    trimmedUsername,
    trimmedBio,
    updateProfile,
  ]);

  const handleLogOut = useCallback(() => {
    logOut();
    navigate("/");
  }, [logOut, navigate]);

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(sanitizedNextPath ?? "/app");
    }
  }, [navigate, sanitizedNextPath]);

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
    <main className="min-h-screen text-theme-text px-6 lg:px-8 pt-[calc(var(--nav-h,4rem)+16px)] pb-8">
      <header className="max-w-5xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {showReturnButton && (
              <button
                onClick={handleBack}
                className="px-4 py-2 bg-theme-primary text-theme-black rounded-lg hover:bg-theme-primary/90 transition-colors font-raleway text-sm"
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

      <section className="max-w-5xl mx-auto grid gap-8 md:grid-cols-2">
        <ProfileCard
          user={user}
          name={name}
          nameTouched={nameTouched}
          isNameValid={isNameValid}
          nameErrorMessage={nameErrorMessage}
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
          onNameChange={handleNameChange}
          onNameBlur={handleNameBlur}
          onUsernameChange={handleUsernameChange}
          onUsernameBlur={handleUsernameBlur}
          onBioChange={handleBioChange}
          onBioBlur={handleBioBlur}
          onSaveProfile={handleProfileSubmit}
          onLogOut={handleLogOut}
        />

        <AtAGlance
          generatedCount={gallery.length}
          creditsRemaining={walletBalance?.totalCredits ?? user.credits}
          subscriptionCredits={walletBalance?.subscriptionCredits}
          topUpCredits={walletBalance?.topUpCredits}
        />

        <WalletBalanceCard className="mt-4" />
      </section>

      {/* Subscription Management */}
      <section className="max-w-5xl mx-auto mt-8">
        <SubscriptionManager />
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
