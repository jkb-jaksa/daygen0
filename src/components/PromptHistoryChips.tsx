import React from "react";
import type { PromptEntry } from "../lib/promptHistory";
import { RefreshCw, Bookmark, BookmarkPlus } from "lucide-react";

type Props = {
  history: PromptEntry[];
  maxVisible?: number;
  onSelect: (text: string) => void;     // fills the textarea
  onRun?: (text: string) => void;       // optional: immediately run
  onClear?: () => void;
  onSavePrompt?: (text: string) => void; // optional: save prompt to library
  isPromptSaved?: (text: string) => boolean; // optional: check if prompt is saved
};

export const PromptHistoryChips: React.FC<Props> = ({
  history,
  maxVisible = 8,
  onSelect,
  onRun,
  onClear,
  onSavePrompt,
  isPromptSaved,
}) => {
  if (!history?.length) return null;
  const visible = history.slice(0, maxVisible);

  return (
    <div className="mt-4 w-full max-w-[calc(100%-140px)] lg:max-w-[calc(100%-140px)] md:max-w-[calc(100%-120px)] sm:max-w-full ml-auto md:ml-[140px] lg:ml-[140px]">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-theme-white/60 font-raleway font-medium">
            Recent prompts
          </span>
        </div>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-theme-white/40 hover:text-theme-text underline underline-offset-4 transition-colors duration-200 font-raleway ml-4"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {visible.map((e, idx) => (
          <div key={idx} className="group flex items-center overflow-hidden rounded-lg border border-theme-dark bg-theme-black/40 hover:bg-theme-black/60 transition-all duration-200">
            <button
              type="button"
              className="flex-1 px-3 py-2 text-sm text-theme-white hover:text-theme-text transition-colors duration-200 font-raleway text-left break-words"
              title={e.text}
              onClick={() => onSelect(e.text)}
            >
              {e.text}
            </button>
            <div className="flex items-center">
              {onSavePrompt && isPromptSaved && (
                <button
                  type="button"
                  className="px-3 py-2 text-sm text-theme-white/60 hover:text-theme-text hover:bg-theme-black/40 transition-all duration-200 border-l border-theme-mid flex items-center gap-1 flex-shrink-0"
                  title={isPromptSaved(e.text) ? "Prompt saved" : "Save prompt"}
                  onClick={() => onSavePrompt(e.text)}
                >
                  {isPromptSaved(e.text) ? (
                    <Bookmark className="w-3 h-3 fill-current" />
                  ) : (
                    <BookmarkPlus className="w-3 h-3" />
                  )}
                  <span className="text-xs font-raleway">Save</span>
                </button>
              )}
              {onRun && (
                <button
                  type="button"
                  className="px-3 py-2 text-sm text-theme-white/60 hover:text-theme-text hover:bg-theme-black/40 transition-all duration-200 border-l border-theme-mid flex items-center gap-1 flex-shrink-0"
                  title="Use this prompt"
                  onClick={() => onRun(e.text)}
                >
                  <RefreshCw className="w-3 h-3" />
                  <span className="text-xs font-raleway">Use the same prompt</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
