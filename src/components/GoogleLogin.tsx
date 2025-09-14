import { useEffect, useRef } from "react";
import { useAuth } from "../auth/AuthContext";

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

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) { 
      console.warn("Missing VITE_GOOGLE_CLIENT_ID"); 
      return; 
    }

    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true; 
    s.defer = true;
    s.onload = () => {
      window.google?.accounts.id.initialize({
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
            console.error("Google sign-in failed", e);
          }
        },
      });
      if (btnRef.current) {
        window.google?.accounts.id.renderButton(btnRef.current, {
          theme: "filled_black",
          size: "large",
          shape: "pill",
          text: "signin_with",
        });
      }
      // Optional: One Tap dialog
      window.google?.accounts.id.prompt();
    };
    document.head.appendChild(s);
    return () => { s.remove(); };
  }, [signIn, signUp, updateProfile, onSuccess]);

  return <div className="w-full"><div ref={btnRef} /></div>;
}
