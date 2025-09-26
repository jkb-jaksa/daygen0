import type { KeyboardEvent as ReactKeyboardEvent } from "react";

// Cross-platform checks for keyboard modifiers + labels.
export const isMac =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad|iPod/.test(navigator.platform || "");

type KeyboardLikeEvent = KeyboardEvent | ReactKeyboardEvent<Element>;

export function modKeyPressed(e: KeyboardLikeEvent) {
  return isMac ? e.metaKey : e.ctrlKey;
}

export const modKeyLabel = isMac ? "⌘" : "Ctrl";
