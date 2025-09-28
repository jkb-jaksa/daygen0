import { buttons } from "../styles/designSystem";

function GoogleLogin({ onSuccess }: { onSuccess?: () => void }) {
  return (
    <button
      type="button"
      onClick={() => onSuccess?.()}
      className={`${buttons.blockPrimary} w-full opacity-60 cursor-not-allowed`}
      disabled
      aria-disabled="true"
    >
      Google sign-in coming soon
    </button>
  );
}

export default GoogleLogin;
