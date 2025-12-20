import { Upload, X } from "lucide-react";
import type { ChangeEvent, RefObject } from "react";
import { useEffect } from "react";
import type { User } from "../../auth/context";
import { buttons, glass, inputs } from "../../styles/designSystem";

export type ProfileCardProps = {
  user: User;
  username: string;
  usernameTouched: boolean;
  isUsernameValid: boolean;
  usernameErrorMessage: string;
  saveError: string | null;
  canSaveProfile: boolean;
  isSavingProfile: boolean;
  isUploadingPic: boolean;
  uploadError: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onProfilePicChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveProfilePic: () => void;
  onUsernameChange: (value: string) => void;
  onUsernameBlur: () => void;
  onBioChange: (value: string) => void;
  onBioBlur: () => void;
  bio: string;
  bioTouched: boolean;
  isBioValid: boolean;
  bioErrorMessage: string;
  onSaveProfile: () => void;
  onLogOut: () => void;
};

export function ProfileCard({
  user,
  username,
  usernameTouched,
  isUsernameValid,
  usernameErrorMessage,
  bio,
  bioTouched,
  isBioValid,
  bioErrorMessage,
  saveError,
  canSaveProfile,
  isSavingProfile,
  isUploadingPic,
  uploadError,
  fileInputRef,
  onProfilePicChange,
  onRemoveProfilePic,
  onUsernameChange,
  onUsernameBlur,
  onBioChange,
  onBioBlur,
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
                  className="size-12 rounded-full object-cover border border-theme-white group-hover:opacity-80 transition-opacity"
                  key={user.profileImage} // Force re-render when URL changes
                />
              ) : (
                <div className="size-12 rounded-full flex items-center justify-center text-theme-text text-lg font-medium font-raleway border border-theme-white group-hover:opacity-80 transition-opacity bg-[conic-gradient(from_0deg,_rgba(245,158,11,0.6),_rgba(239,68,68,0.6),_rgba(59,130,246,0.6),_rgba(34,211,238,0.6),_rgba(245,158,11,0.6))]">
                  {(user.username || user.displayName || user.email)[0]?.toUpperCase()}
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
        <div className="-mt-2 mb-4">
          <label className="block text-sm text-theme-white mb-1 font-raleway" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className={inputs.base}
            value={user.email}
            readOnly
            disabled
            title="Email cannot be changed"
          />
        </div>

        <div className="-mt-2">
          <label className="block text-sm text-theme-white mb-1 font-raleway" htmlFor="username">
            Profile URL <span className="text-red-400">*</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-theme-white/60 font-raleway">daygen.ai/creator/</span>
            <input
              id="username"
              className={`${inputs.base} flex-1`}
              value={username}
              onChange={(event) => onUsernameChange(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              onBlur={onUsernameBlur}
              placeholder="your-username"
            />
          </div>
          <div aria-live="polite" role="status" className="min-h-[1rem]">
            {(saveError || (usernameTouched && !isUsernameValid)) && (
              <p className="mt-1 text-xs font-raleway text-red-400">{saveError ?? usernameErrorMessage}</p>
            )}
            {isUsernameValid && username && (
              <p className="mt-1 text-xs font-raleway text-theme-white/60">
                Your profile: daygen.ai/creator/{username}
              </p>
            )}
          </div>
        </div>

        <div className="-mt-4">
          <label className="block text-sm text-theme-white mb-1 font-raleway" htmlFor="bio">
            Bio
          </label>
          <textarea
            id="bio"
            className={`${inputs.base} min-h-[100px] resize-none py-2`}
            value={bio}
            onChange={(event) => onBioChange(event.target.value)}
            onBlur={onBioBlur}
            placeholder="Tell us about yourself..."
            maxLength={500}
          />
          <div className="flex justify-between items-start min-h-[1rem] mt-1">
            <div aria-live="polite" role="status">
              {(bioTouched && !isBioValid) && (
                <p className="text-xs font-raleway text-red-400">{bioErrorMessage}</p>
              )}
            </div>
            <span className="text-xs text-theme-white/50">{bio.length}/500</span>
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
