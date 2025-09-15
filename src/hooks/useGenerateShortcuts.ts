import { useCallback, useRef } from "react";
import { modKeyPressed, isMac } from "../lib/os";

type Options = {
  enabled?: boolean;          // disable while loading, etc.
  onGenerate: () => void | Promise<void>;
};

/**
 * Attach to your <textarea> via onKeyDown to support:
 * - Enter => generate
 * - Shift+Enter => newline
 * - Ctrl/Cmd+Enter => generate
 * Also safe for IME composition.
 */
export function useGenerateShortcuts({ onGenerate, enabled = true }: Options) {
  const busyRef = useRef(false);

  const onKeyDown = useCallback(
    async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!enabled) return;
      if ((e.nativeEvent as any).isComposing) return; // don't interfere with IME input
      if (e.key !== "Enter") return;

      const mod = modKeyPressed(e);
      const shift = e.shiftKey;

      // Generate on: Cmd/Ctrl+Enter OR plain Enter
      if (mod || (!shift && !mod)) {
        e.preventDefault(); // avoid inserting newline
        if (busyRef.current) return;
        busyRef.current = true;
        try {
          await onGenerate();
        } finally {
          busyRef.current = false;
        }
      }
      // Shift+Enter: do nothing -> browser inserts newline
    },
    [enabled, onGenerate]
  );

  return { onKeyDown, isMac };
}
