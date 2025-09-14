import { useEffect, useMemo, useState, useRef } from "react";
import { useAuth } from "../auth/AuthContext";
import { Upload, X, Camera } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

type GalleryItem = { url: string; prompt: string; model: string; timestamp: string; ownerId?: string };

export default function Account() {
  const { user, updateProfile, signOut, storagePrefix } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [isUploadingPic, setIsUploadingPic] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const galleryKey = useMemo(() => storagePrefix + "gallery", [storagePrefix]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(galleryKey);
      if (raw) setGallery(JSON.parse(raw));
    } catch {}
  }, [galleryKey]);

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
      alert('Failed to read image file');
      setIsUploadingPic(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveProfilePic = () => {
    updateProfile({ profilePic: undefined });
  };

  const handleSaveProfile = () => {
    updateProfile({ name });
    
    // Check if there's a 'next' parameter to redirect to
    const nextPath = searchParams.get('next');
    if (nextPath) {
      try {
        const decodedPath = decodeURIComponent(nextPath);
        navigate(decodedPath);
      } catch (e) {
        console.error('Failed to decode next path:', e);
        navigate('/create'); // fallback
      }
    }
  };

  const nextPath = searchParams.get('next');
  const hasPendingRedirect = !!nextPath;

  if (!user) return (
    <main className="min-h-screen bg-black text-d-text px-6 pt-24">
      <h1 className="text-3xl font-cabin mb-2">My account</h1>
      <p>Please log in to view your account.</p>
    </main>
  );

  return (
    <main className="min-h-screen bg-black text-d-text px-6 pt-24">
      <header className="max-w-5xl mx-auto mb-8">
        <div className="flex items-center gap-3">
          <div className="relative group">
            {user.profilePic ? (
              <img
                src={user.profilePic}
                alt="Profile"
                className="size-10 rounded-full object-cover border-2 border-d-dark"
              />
            ) : (
              <span className="inline-grid place-items-center size-10 rounded-full text-black text-lg font-bold" style={{ background: user.color || "#faaa16" }}>
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
            <h1 className="text-3xl font-cabin">My account</h1>
            <div className="text-d-text/70 text-sm">{user.email}</div>
            {hasPendingRedirect && (
              <div className="text-xs text-brand mt-1">
                Complete your profile to continue to {nextPath === '/create' ? 'Create' : 'your destination'}
              </div>
            )}
          </div>
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
        <div className="rounded-2xl bg-white/5 border border-d-black p-5">
          <h3 className="text-xl font-cabin mb-3">Profile</h3>
          
          <div className="mb-4">
            <label className="block text-sm text-d-text mb-2">Profile Picture</label>
            <div className="flex items-center gap-3">
              <div className="relative">
                {user.profilePic ? (
                  <img
                    src={user.profilePic}
                    alt="Profile"
                    className="size-16 rounded-full object-cover border-2 border-d-dark"
                  />
                ) : (
                  <div 
                    className="size-16 rounded-full flex items-center justify-center text-white text-xl font-bold border-2 border-d-dark"
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
                  className="btn btn-white text-black text-sm"
                >
                  <Upload className="size-4 mr-1" />
                  {isUploadingPic ? "Uploading..." : "Upload"}
                </button>
                {user.profilePic && (
                  <button
                    onClick={handleRemoveProfilePic}
                    className="btn btn-orange text-black text-sm"
                  >
                    <X className="size-4 mr-1" />
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          <label className="block text-sm text-d-text mb-1">Display name</label>
          <input className="w-full bg-black/30 border border-d-black rounded-lg p-2 text-d-white" value={name} onChange={e=>setName(e.target.value)} />
          <div className="flex gap-2 mt-3">
            <button className="btn btn-white text-black" onClick={handleSaveProfile}>
              {hasPendingRedirect ? 'Save & Continue' : 'Save'}
            </button>
            <button className="btn btn-orange text-black" onClick={signOut}>Log out</button>
          </div>
        </div>

        <div className="rounded-2xl bg-white/5 border border-d-black p-5">
          <h3 className="text-xl font-cabin mb-3">At a glance</h3>
          <ul className="text-sm font-raleway text-d-white/85 space-y-1">
            <li>Generated images: <strong>{gallery.length}</strong></li>
          </ul>
        </div>
      </section>

      <section className="max-w-5xl mx-auto mt-10">
        <h3 className="text-xl font-cabin mb-3">Recent images</h3>
        {gallery.length === 0 ? (
          <p className="text-d-text/70">Nothing yet. Try the Create page.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {gallery.slice(0, 12).map((g, i) => (
              <img key={i} src={g.url} alt={g.prompt} className="w-full h-24 object-cover rounded-xl border border-d-black" />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
