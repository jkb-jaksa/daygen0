import React from "react";
import type { PromptEntry } from "../lib/promptHistory";
import { Play } from "lucide-react";

type Props = {
  history: PromptEntry[];
  maxVisible?: number;
  onSelect: (text: string) => void;     // fills the textarea
  onRun?: (text: string) => void;       // optional: immediately run
  onClear?: () => void;
};

export const PromptHistoryChips: React.FC<Props> = ({
  history,
  maxVisible = 8,
  onSelect,
  onRun,
  onClear,
}) => {
  if (!history?.length) return null;
  const visible = history.slice(0, maxVisible);

  return (
    <div className="mt-4 w-full max-w-[calc(100%-140px)] lg:max-w-[calc(100%-140px)] md:max-w-[calc(100%-120px)] sm:max-w-full ml-auto md:ml-[140px] lg:ml-[140px]">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-d-white/60 font-raleway font-medium">
            Recent prompts
          </span>
        </div>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-d-white/40 hover:text-d-orange-1 underline underline-offset-4 transition-colors duration-200 font-raleway ml-4"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {visible.map((e, idx) => (
          <div key={idx} className="group flex items-center overflow-hidden rounded-lg border border-d-mid bg-d-black/40 hover:bg-d-black/60 transition-all duration-200">
            <button
              type="button"
              className="flex-1 px-3 py-2 text-sm text-d-white hover:text-brand transition-colors duration-200 font-raleway text-left break-words"
              title={e.text}
              onClick={() => onSelect(e.text)}
            >
              {e.text}
            </button>
            {onRun && (
              <button
                type="button"
                className="px-3 py-2 text-sm text-d-white/60 hover:text-d-orange-1 hover:bg-d-black/40 transition-all duration-200 border-l border-d-mid flex items-center gap-1 flex-shrink-0"
                title="Run this prompt"
                onClick={() => onRun(e.text)}
              >
                <Play className="w-3 h-3" />
                <span className="text-xs font-raleway">Rerun</span>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
