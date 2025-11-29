import { Suspense, lazy, memo } from "react";

import type { PromptEntry } from "../../lib/promptHistory";

const PromptHistoryChips = lazy(() =>
  import("../PromptHistoryChips").then(mod => ({ default: mod.PromptHistoryChips })),
);

export interface PromptHistoryPanelProps {
  history: PromptEntry[];
  onSelect: (text: string) => void;
  onRun: (text: string) => void;
  onClear: () => void;
  onSavePrompt?: (text: string) => void;
  isPromptSaved?: (text: string) => boolean;
}

function PromptHistoryPanelComponent({ history, onSelect, onRun, onClear, onSavePrompt, isPromptSaved }: PromptHistoryPanelProps) {
  return (
    <div className="w-full pl-3">
      <Suspense fallback={<div className="h-9" />}>
        <PromptHistoryChips 
          history={history} 
          onSelect={onSelect} 
          onRun={onRun} 
          onClear={onClear}
          onSavePrompt={onSavePrompt}
          isPromptSaved={isPromptSaved}
        />
      </Suspense>
    </div>
  );
}

export const PromptHistoryPanel = memo(PromptHistoryPanelComponent);

export default PromptHistoryPanel;
