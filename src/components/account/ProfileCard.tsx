import { Upload, X } from "lucide-react";
import type { ChangeEvent, RefObject } from "react";
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
  fileInputRef: RefObject<HTMLInputElement>;
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
  return (
    <div className={`${glass.surface} p-5`}>
      <h3 className="text-lg font-raleway mb-3 text-d-text">Profile</h3>

      <div className="mb-4">
        <label className="block text-sm text-d-white mb-2 font-raleway">Picture</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onProfilePicChange}
          className="hidden"
        />
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="relative group cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Update profile picture"
          >
            {user.profileImage ? (
              <img
                src={user.profileImage}
                alt="Profile"
                className="size-12 rounded-full object-cover border-2 border-d-dark group-hover:opacity-80 transition-opacity"
              />
            ) : (
              <div className="size-12 rounded-full flex items-center justify-center text-d-text text-lg font-bold font-raleway border-2 border-d-dark group-hover:opacity-80 transition-opacity bg-d-dark">
                {(user.displayName || user.email)[0]?.toUpperCase()}
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 bg-d-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
              <Upload className="size-4 text-d-text" />
            </div>
            {isUploadingPic && (
              <div className="pointer-events-none absolute inset-0 bg-d-black/70 rounded-full flex items-center justify-center">
                <div className="text-d-text text-xs font-raleway">Uploading...</div>
              </div>
            )}
          </button>
          {user.profileImage && (
            <button
              type="button"
              onClick={() => {
                void onRemoveProfilePic();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors duration-200 ${glass.prompt} text-d-white border-d-dark hover:border-d-text hover:text-d-text font-raleway text-sm`}
            >
              <X className="w-4 h-4 rounded-full" />
              Remove
            </button>
          )}
        </div>
        {uploadError && <p className="mt-2 text-xs font-raleway text-red-400">{uploadError}</p>}
        <p className="mt-2 text-xs font-raleway text-d-white/60">Profile pictures update immediately when you complete cropping.</p>
      </div>

      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          onSaveProfile();
        }}
      >
        <div>
          <label className="block text-sm text-d-white mb-1 font-raleway" htmlFor="display-name">
            Display name
          </label>
          <input
            id="display-name"
            className={inputs.base}
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            onBlur={onNameBlur}
            placeholder="Enter your display name"
          />
          {(saveError || (nameTouched && !isNameValid)) && (
            <p className="mt-1 text-xs font-raleway text-red-400">{saveError ?? nameErrorMessage}</p>
          )}
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
