import { useEffect, useState, useRef } from "react";
import { useAuth } from "../auth/AuthContext";
import { Upload, X } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ProfileCropModal from "./ProfileCropModal";
import { getPersistedValue, migrateKeyToIndexedDb } from "../lib/clientStorage";
import { buttons, glass } from "../styles/designSystem";
import { debugError, debugLog } from "../utils/debug";

type GalleryItem = { url: string; prompt: string; model: string; timestamp: string; ownerId?: string };

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
    const nextPath = searchParams.get('next');
    if (nextPath) {
      try {
        const decodedPath = decodeURIComponent(nextPath);
        navigate(decodedPath);
      } catch (e) {
        debugError('Failed to decode next path:', e);
        navigate('/create'); // fallback
      }
    } else {
      // If no 'next' parameter, redirect to create page to close account section
      navigate('/create');
    }
  };

  const nextPath = searchParams.get('next');
  const hasPendingRedirect = !!nextPath;

  // If user is authenticated and there's a next parameter, redirect them
  useEffect(() => {
    if (user && nextPath) {
      try {
        const decodedPath = decodeURIComponent(nextPath);
        debugLog('Account - redirecting authenticated user to:', decodedPath);
        navigate(decodedPath, { replace: true });
      } catch (e) {
        debugError('Failed to decode next path:', e);
        navigate('/create', { replace: true });
      }
    }
  }, [user, nextPath, navigate]);

  if (!user) return (
    <main className="min-h-screen bg-black text-d-text px-6 lg:px-8 pt-[calc(var(--nav-h)+0.5rem)] pb-8">
      <p className="text-d-white font-raleway">Please log in to view your account.</p>
    </main>
  );

  // If user is authenticated and there's a next parameter, show loading while redirecting
  if (user && nextPath) {
    return (
      <main className="min-h-screen bg-black text-d-text px-6 lg:px-8 pt-[calc(var(--nav-h)+0.5rem)] pb-8">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-2xl font-raleway mb-4 text-d-text">Redirecting...</h1>
          <p className="text-d-white font-raleway">Taking you to your destination.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-d-text px-6 lg:px-8 pt-[calc(var(--nav-h)+0.5rem)] pb-8">
      <header className="max-w-5xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {hasPendingRedirect && (
              <div className="text-xs text-brand mt-1 font-raleway">
                Complete your profile to continue to {nextPath === '/create' ? 'Create' : 'your destination'}
              </div>
            )}
          </div>
          <button
            onClick={() => navigate('/create')}
            className="p-2 hover:bg-d-dark/50 rounded-lg transition-colors group"
            title="Close account"
          >
            <X className="w-5 h-5 text-d-white group-hover:text-brand transition-colors" />
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
                    className="size-12 rounded-full flex items-center justify-center text-white text-lg font-bold font-raleway border-2 border-d-dark group-hover:opacity-80 transition-opacity"
                    style={{ background: user.color || "#FF8C00" }}
                  >
                    {(user.name || user.email)[0]?.toUpperCase()}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                  <Upload className="size-4 text-white" />
                </div>
                {isUploadingPic && (
                  <div className="absolute inset-0 bg-black/70 rounded-full flex items-center justify-center">
                    <div className="text-white text-xs font-raleway">Uploading...</div>
                  </div>
                )}
              </div>
              {user.profilePic && (
                <button
                  onClick={handleRemoveProfilePic}
                  className={buttons.primary}
                >
                  <X className="size-4" />
                  Remove
                </button>
              )}
            </div>
          </div>

          <label className="block text-sm text-d-white mb-1 font-raleway">Display name</label>
          <input className="w-full py-3 rounded-lg bg-b-mid text-d-white placeholder-d-white/60 px-4 border border-b-mid focus:border-d-light focus:outline-none ring-0 focus:ring-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] font-raleway transition-colors duration-200" value={name} onChange={e=>setName(e.target.value)} placeholder="Enter your display name" />
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
