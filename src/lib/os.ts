// Cross-platform checks for keyboard modifiers + labels.
export const isMac =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad|iPod/.test(navigator.platform || "");

export function modKeyPressed(e: KeyboardEvent | React.KeyboardEvent) {
  return isMac ? (e as any).metaKey : (e as any).ctrlKey;
}

export const modKeyLabel = isMac ? "⌘" : "Ctrl";
