import { useEffect, useRef } from "react";
import { useAuth } from "../auth/AuthContext";
import { debugError, debugWarn } from "../utils/debug";

const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const GOOGLE_SCRIPT_ATTR = "data-daygen-google-client";

let hasInitializedGoogleClient = false;

declare global { 
  interface Window { 
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, config: any) => void;
          prompt: () => void;
          disableAutoSelect: () => void;
          revoke: (email: string, callback: () => void) => void;
        };
      };
    };
  } 
}

function decodeJwt(idToken: string) {
  const [, payload] = idToken.split(".");
  const pad = "=".repeat((4 - (payload.length % 4)) % 4);
  const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/") + pad);
  return JSON.parse(json);
}

export default function GoogleLogin({ onSuccess }: { onSuccess?: () => void }) {
  const { signIn, signUp, updateProfile } = useAuth();
  const btnRef = useRef<HTMLDivElement>(null);
  const scriptAddedRef = useRef(false);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      debugWarn("Missing VITE_GOOGLE_CLIENT_ID");
      return;
    }

    const initializeGoogle = () => {
      if (!window.google?.accounts?.id) return;

      if (!hasInitializedGoogleClient) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (resp: any) => {
            try {
              const p = decodeJwt(resp.credential);
              const email = p.email as string;
              const name = p.name as string | undefined;
              const picture = p.picture as string | undefined;

              // Create or load the local user, then enrich profile
              await signIn(email).catch(() => signUp(email, name));
              if (name || picture) updateProfile({ name, profilePic: picture });
              onSuccess?.();
            } catch (e) {
              debugError("Google sign-in failed", e);
            }
          },
        });
        hasInitializedGoogleClient = true;
      }

      if (btnRef.current) {
        window.google.accounts.id.renderButton(btnRef.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
          text: "signin_with",
          width: "100%",
        });
      }

      window.google.accounts.id.prompt();
    };

    if (window.google?.accounts?.id) {
      initializeGoogle();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(`script[${GOOGLE_SCRIPT_ATTR}]`);
    const handleLoad = () => {
      initializeGoogle();
    };

    if (existingScript) {
      existingScript.addEventListener("load", handleLoad);
      return () => {
        existingScript.removeEventListener("load", handleLoad);
      };
    }

    const script = document.createElement("script");
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.setAttribute(GOOGLE_SCRIPT_ATTR, "true");
    script.addEventListener("load", handleLoad);
    document.head.appendChild(script);
    scriptAddedRef.current = true;

    return () => {
      script.removeEventListener("load", handleLoad);
      if (scriptAddedRef.current) {
        script.remove();
      }
    };
  }, [signIn, signUp, updateProfile, onSuccess]);

  return (
    <div className="w-full" aria-label="Continue with Google">
      <div ref={btnRef} />
    </div>
  );
}
