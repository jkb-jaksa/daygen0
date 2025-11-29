import { Upload, X } from "lucide-react";
import type { ChangeEvent, RefObject } from "react";
import { useEffect } from "react";
import type { User } from "../../auth/context";
import { buttons, glass, inputs } from "../../styles/designSystem";

export type ProfileCardProps = {
  user: User;
  name: string;
  nameTouched: boolean;
  isNameValid: boolean;
  nameErrorMessage: string;
  saveError: string | null;
  canSaveProfile: boolean;
  isSavingProfile: boolean;
  isUploadingPic: boolean;
  uploadError: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onProfilePicChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveProfilePic: () => void;
  onNameChange: (value: string) => void;
  onNameBlur: () => void;
  onSaveProfile: () => void;
  onLogOut: () => void;
};

export function ProfileCard({
  user,
  name,
  nameTouched,
  isNameValid,
  nameErrorMessage,
  saveError,
  canSaveProfile,
  isSavingProfile,
  isUploadingPic,
  uploadError,
  fileInputRef,
  onProfilePicChange,
  onRemoveProfilePic,
  onNameChange,
  onNameBlur,
  onSaveProfile,
  onLogOut,
}: ProfileCardProps) {
  // Debug log to track profile image changes
  console.log('ProfileCard render - user.profileImage:', user.profileImage);
  console.log('ProfileCard render - user object:', user);
  
  // Track profile image changes
  useEffect(() => {
    console.log('ProfileCard - Profile image changed to:', user.profileImage);
  }, [user.profileImage]);
  return (
    <div className={`${glass.surface} p-5`}>
      <h3 className="text-lg font-raleway mb-3 text-theme-text">Profile</h3>

      <div className="mb-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onProfilePicChange}
          className="hidden"
        />
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              type="button"
              className="relative group cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Update profile picture"
            >
              {user.profileImage ? (
                <img
                  src={`${user.profileImage}?t=${Date.now()}`}
                  alt="Profile"
                  className="size-12 rounded-full object-cover border-2 border-theme-dark group-hover:opacity-80 transition-opacity"
                  key={user.profileImage} // Force re-render when URL changes
                />
              ) : (
                <div className="size-12 rounded-full flex items-center justify-center text-theme-text text-lg font-medium font-raleway border-2 border-theme-dark group-hover:opacity-80 transition-opacity bg-theme-dark">
                  {(user.displayName || user.email)[0]?.toUpperCase()}
                </div>
              )}
              <div className="pointer-events-none absolute inset-0 bg-theme-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                <Upload className="size-4 text-theme-text" />
              </div>
              {isUploadingPic && (
                <div className="pointer-events-none absolute inset-0 bg-theme-black/70 rounded-full flex items-center justify-center">
                  <div className="text-theme-text text-xs font-raleway">Uploading...</div>
                </div>
              )}
            </button>
            {user.profileImage && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void onRemoveProfilePic();
                }}
                className="absolute -top-1 -right-1 size-5 rounded-full bg-theme-black/80 border border-theme-dark flex items-center justify-center transition-colors duration-200 group"
                aria-label="Remove profile picture"
              >
                <X className="w-3 h-3 text-theme-white group-hover:text-theme-text" />
              </button>
            )}
          </div>
        </div>
        <div aria-live="polite" role="status" className="min-h-[1rem]">
          {uploadError && <p className="mt-2 text-xs font-raleway text-red-400">{uploadError}</p>}
        </div>
      </div>

      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          onSaveProfile();
        }}
      >
        <div>
          <label className="block text-sm text-theme-white mb-1 font-raleway" htmlFor="display-name">
            Display Name
          </label>
          <input
            id="display-name"
            className={inputs.base}
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            onBlur={onNameBlur}
            placeholder="Enter your display name"
          />
          <div aria-live="polite" role="status" className="min-h-[1rem]">
            {(saveError || (nameTouched && !isNameValid)) && (
              <p className="mt-1 text-xs font-raleway text-red-400">{saveError ?? nameErrorMessage}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <button type="button" className={buttons.ghost} onClick={onLogOut}>
            Log out
          </button>
          <button type="submit" className={buttons.primary} disabled={!canSaveProfile}>
            {isSavingProfile ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ProfileCard;
