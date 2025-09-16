import { useEffect, useState, useRef } from "react";
import { useAuth } from "../auth/AuthContext";
import { Upload, X, Camera } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ProfileCropModal from "./ProfileCropModal";
import { getModelDisplayName } from "../utils/modelUtils";
import { getPersistedValue, migrateKeyToIndexedDb } from "../lib/clientStorage";

type GalleryItem = { url: string; prompt: string; model: string; timestamp: string; ownerId?: string };

export default function Account() {
  const { user, updateProfile, signOut, storagePrefix } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [isUploadingPic, setIsUploadingPic] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string>("");
  const [selectedImage, setSelectedImage] = useState<GalleryItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Keep the input in sync if user loads after first render, but don't override user input
  useEffect(() => {
    if (user?.name && name === "") {
      setName(user.name);
    }
  }, [user?.name]);


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
        console.error('Account - Error loading gallery:', error);
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
        console.error('Failed to decode next path:', e);
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
        console.log('Account - redirecting authenticated user to:', decodedPath);
        navigate(decodedPath, { replace: true });
      } catch (e) {
        console.error('Failed to decode next path:', e);
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
          <h1 className="text-2xl font-cabin mb-4 text-d-text">Redirecting...</h1>
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
            <div className="relative group">
              {user.profilePic ? (
                <img
                  src={user.profilePic}
                  alt="Profile"
                  className="size-8 rounded-full object-cover border-2 border-d-dark"
                />
              ) : (
                <span className="inline-grid place-items-center size-8 rounded-full text-black text-sm font-bold font-cabin" style={{ background: user.color || "#faaa16" }}>
                  {(user.name || user.email)[0]?.toUpperCase()}
                </span>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center"
              >
                <Camera className="size-4 text-white" />
              </button>
            </div>
            <div>
              <div className="text-d-white text-sm font-raleway">{user.email}</div>
              {hasPendingRedirect && (
                <div className="text-xs text-brand mt-1 font-raleway">
                  Complete your profile to continue to {nextPath === '/create' ? 'Create' : 'your destination'}
                </div>
              )}
            </div>
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
        <div className="rounded-2xl bg-d-dark border border-d-dark p-5">
          <h3 className="text-lg font-cabin mb-3 text-d-text">Profile</h3>
          
          <div className="mb-4">
            <label className="block text-sm text-d-white mb-2 font-raleway">Picture</label>
            <div className="flex items-center gap-3">
              <div className="relative">
                {user.profilePic ? (
                  <img
                    src={user.profilePic}
                    alt="Profile"
                    className="size-12 rounded-full object-cover border-2 border-d-dark"
                  />
                ) : (
                  <div 
                    className="size-12 rounded-full flex items-center justify-center text-white text-lg font-bold font-cabin border-2 border-d-dark"
                    style={{ background: user.color || "#faaa16" }}
                  >
                    {(user.name || user.email)[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPic}
                  className="btn btn-white text-black font-raleway"
                >
                  <Upload className="size-4 mr-1" />
                  {isUploadingPic ? "Uploading..." : "Upload"}
                </button>
                {user.profilePic && (
                  <button
                    onClick={handleRemoveProfilePic}
                    className="btn text-black font-raleway"
                    style={{
                      backgroundColor: '#faaa16'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#ffb833';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#faaa16';
                    }}
                  >
                    <X className="size-4 mr-1" />
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          <label className="block text-sm text-d-white mb-1 font-raleway">Display name</label>
          <input className="w-full py-3 rounded-lg bg-b-mid text-d-white placeholder-d-white/60 px-4 border border-b-mid focus:border-d-light focus:outline-none ring-0 focus:ring-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] font-raleway transition-colors duration-200" value={name} onChange={e=>setName(e.target.value)} placeholder="Enter your display name" />
          <div className="flex gap-2 mt-3">
            <button
              className="btn btn-white text-black font-raleway disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleSaveProfile}
            >
              Save
            </button>
            <button 
              className="btn text-black font-raleway"
              style={{
                backgroundColor: '#faaa16'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#ffb833';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#faaa16';
              }}
              onClick={signOut}
            >
              Log out
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-d-dark border border-d-dark p-5">
          <h3 className="text-lg font-cabin mb-3 text-d-text">At a glance</h3>
          <ul className="text-sm font-raleway text-d-white space-y-1">
            <li>Generated images: <strong>{gallery.length}</strong></li>
          </ul>
        </div>
      </section>

      <section className="max-w-5xl mx-auto mt-10 mb-4">
        <h3 className="text-lg font-cabin mb-3 text-d-text">Recent images</h3>
        {gallery.length === 0 ? (
          <p className="text-d-white font-raleway">Nothing yet. Try the Create page.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {gallery.slice(0, 12).map((g, i) => (
              <img 
                key={i} 
                src={g.url} 
                alt={g.prompt} 
                className="w-full h-24 object-cover rounded-xl border border-d-black cursor-pointer hover:opacity-80 transition-opacity" 
                onClick={() => setSelectedImage(g)}
                title={`${g.prompt} - ${g.model}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* Profile Crop Modal */}
      <ProfileCropModal
        isOpen={cropModalOpen}
        onClose={() => setCropModalOpen(false)}
        imageSrc={imageToCrop}
        onCropComplete={handleCropComplete}
      />

      {/* Image View Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-[130] bg-black/90 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors group"
            >
              <X className="w-6 h-6 text-white group-hover:text-brand transition-colors" />
            </button>
            <img
              src={selectedImage.url}
              alt={selectedImage.prompt}
              className="w-full h-full object-contain rounded-lg"
            />
            <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-sm rounded-lg p-4">
              <p className="text-white font-raleway text-sm mb-1">{selectedImage.prompt}</p>
              <p className="text-gray-300 font-raleway text-xs">Model: {getModelDisplayName(selectedImage.model)}</p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
