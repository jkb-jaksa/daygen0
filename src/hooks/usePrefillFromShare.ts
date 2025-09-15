import { useEffect } from "react";
import { decodeSharePrompt } from "../lib/shareUtils";

/**
 * Hook to auto-fill prompt from shared links
 * Looks for ?from=share&prompt=<base64-encoded-prompt> in URL
 */
export function usePrefillFromShare(setPrompt: (prompt: string) => void) {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const from = urlParams.get("from");
    const encodedPrompt = urlParams.get("prompt");
    
    if (from === "share" && encodedPrompt) {
      const decodedPrompt = decodeSharePrompt(encodedPrompt);
      if (decodedPrompt) {
        setPrompt(decodedPrompt);
        // Clean up the URL to remove the share parameters
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete("from");
        newUrl.searchParams.delete("prompt");
        window.history.replaceState({}, "", newUrl.toString());
      }
    }
  }, [setPrompt]);
}
