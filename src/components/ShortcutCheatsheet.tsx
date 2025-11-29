import React from "react";
import { modKeyLabel } from "../lib/os";

type Props = { id?: string };

export const ShortcutCheatsheet: React.FC<Props> = ({ id }) => (
  <div id={id} className="mt-2 text-xs text-theme-white/60 font-raleway">
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      <span><kbd className="rounded border border-theme-mid px-1 py-0.5 text-xs bg-theme-black/40 text-theme-white/80">Enter</kbd> Generate</span>
      <span><kbd className="rounded border border-theme-mid px-1 py-0.5 text-xs bg-theme-black/40 text-theme-white/80">Shift</kbd> + <kbd className="rounded border border-theme-mid px-1 py-0.5 text-xs bg-theme-black/40 text-theme-white/80">Enter</kbd> New line</span>
      <span><kbd className="rounded border border-theme-mid px-1 py-0.5 text-xs bg-theme-black/40 text-theme-white/80">{modKeyLabel}</kbd> + <kbd className="rounded border border-theme-mid px-1 py-0.5 text-xs bg-theme-black/40 text-theme-white/80">Enter</kbd> Generate</span>
    </div>
  </div>
);
