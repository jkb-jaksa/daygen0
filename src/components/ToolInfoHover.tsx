import { type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, HelpCircle } from "lucide-react";
import { glass, buttons, tooltips } from "../styles/designSystem";
import {
  buildFallbackTool,
  getLearnToolByName,
  slugifyLearnTool,
} from "../data/learnTools";
import { getToolLogo } from "../utils/toolLogos";

const CARD_WIDTH = 480;
const DEFAULT_CARD_HEIGHT = 240;
const VIEWPORT_MARGIN = 16;
const TRIGGER_SPACING = 12;

export type ToolInfoHoverProps = {
  toolName: string;
  className?: string;
  iconClassName?: string;
  customTooltipText?: string; // If provided, shows a simple tooltip instead of the full card
};

export function ToolInfoHover({ toolName, className, iconClassName, customTooltipText }: ToolInfoHoverProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<number>();
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const { tool, matchedTool } = useMemo(() => {
    const match = getLearnToolByName(toolName);
    if (match) {
      return { tool: match, matchedTool: match };
    }

    const fallbackSlug = toolName ? slugifyLearnTool(toolName) : "tool";
    return { tool: buildFallbackTool(fallbackSlug), matchedTool: undefined };
  }, [toolName]);

  const displayName = useMemo(() => toolName?.trim() || tool.name, [toolName, tool.name]);
  const logo = useMemo(
    () => getToolLogo(displayName) ?? getToolLogo(tool.name),
    [displayName, tool.name],
  );
  const knowledgeBaseSlug = matchedTool?.slug ?? tool.slug;
  const knowledgeBasePath = `/learn/tools/${knowledgeBaseSlug}`;

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = undefined;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    clearHideTimer();
    hideTimerRef.current = window.setTimeout(() => {
      setIsOpen(false);
    }, 120);
  }, [clearHideTimer]);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const scrollX = window.scrollX ?? window.pageXOffset;
    const scrollY = window.scrollY ?? window.pageYOffset;

    if (customTooltipText) {
      // Simple tooltip: center horizontally, position above or below
      // Use viewport coordinates for fixed positioning
      const left = rect.left + rect.width / 2;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const estimatedHeight = 80; // Approximate height for longer tooltip text
      
      let top;
      if (spaceBelow >= estimatedHeight + TRIGGER_SPACING || spaceBelow >= spaceAbove) {
        // Position below
        top = rect.bottom + TRIGGER_SPACING;
      } else {
        // Position above
        top = rect.top - TRIGGER_SPACING - estimatedHeight;
        const minTop = VIEWPORT_MARGIN;
        if (top < minTop) {
          top = minTop;
        }
      }

      // Ensure tooltip stays within viewport horizontally
      const tooltipWidth = 320; // max-w-[320px]
      const minLeft = VIEWPORT_MARGIN + tooltipWidth / 2;
      const maxLeft = window.innerWidth - VIEWPORT_MARGIN - tooltipWidth / 2;
      const clampedLeft = Math.max(minLeft, Math.min(maxLeft, left));

      setPosition({ top, left: clampedLeft });
    } else {
      // Full card positioning
      const width = cardRef.current?.offsetWidth ?? CARD_WIDTH;
      const height = cardRef.current?.offsetHeight ?? DEFAULT_CARD_HEIGHT;

      // Check if the trigger is inside a dropdown menu by looking for common dropdown classes
      const isInDropdown = triggerRef.current.closest('.model-selector, [role="menu"], [role="listbox"], .dropdown, .menu-portal');
      
      let left;
      if (isInDropdown) {
        // In dropdown context, position to the right of the trigger to avoid hiding other items
        left = rect.right + scrollX + TRIGGER_SPACING;
      } else {
        // Default centering behavior for other contexts
        left = rect.left + scrollX + rect.width / 2 - width / 2;
      }
      
      const minLeft = scrollX + VIEWPORT_MARGIN;
      const maxLeft = scrollX + window.innerWidth - width - VIEWPORT_MARGIN;
      if (left < minLeft) left = minLeft;
      if (left > maxLeft) left = Math.max(minLeft, maxLeft);

      let top = rect.bottom + scrollY + TRIGGER_SPACING;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      if (top + height > scrollY + window.innerHeight - VIEWPORT_MARGIN && spaceAbove > spaceBelow) {
        top = rect.top + scrollY - TRIGGER_SPACING - height;
        const minTop = scrollY + VIEWPORT_MARGIN;
        if (top < minTop) {
          top = minTop;
        }
      }

      setPosition({ top, left });
    }
  }, [customTooltipText]);

  const openCard = useCallback(() => {
    clearHideTimer();
    setIsOpen(true);
    requestAnimationFrame(() => {
      updatePosition();
    });
  }, [clearHideTimer, updatePosition]);

  const handleTriggerMouseEnter = useCallback(() => {
    openCard();
  }, [openCard]);

  const handleTriggerMouseLeave = useCallback(() => {
    scheduleClose();
  }, [scheduleClose]);

  const handleTriggerFocus = useCallback(() => {
    openCard();
  }, [openCard]);

  const handleTriggerBlur = useCallback(() => {
    scheduleClose();
  }, [scheduleClose]);

  const handleTriggerKeyDown = useCallback(
    (event: KeyboardEvent<HTMLSpanElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openCard();
      } else if (event.key === "Escape") {
        scheduleClose();
      }
    },
    [openCard, scheduleClose],
  );

  useEffect(() => {
    setIsMounted(true);
    return () => {
      clearHideTimer();
    };
  }, [clearHideTimer]);

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();
    const handleReposition = () => updatePosition();

    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [isOpen, updatePosition]);

  if (!isMounted) {
    return (
      <span
        ref={triggerRef}
        className={`relative inline-flex items-center ${className ?? ""}`.trim()}
        tabIndex={0}
      >
        <HelpCircle
          className={`w-3 h-3 opacity-60 transition-opacity duration-200 cursor-pointer ${iconClassName ?? ""}`.trim()}
          aria-hidden="true"
        />
      </span>
    );
  }

  return (
    <>
      <span
        ref={triggerRef}
        className={`relative inline-flex items-center ${className ?? ""}`.trim()}
        tabIndex={0}
        role="button"
        aria-label={`Learn more about ${displayName}`}
        onMouseEnter={handleTriggerMouseEnter}
        onMouseLeave={handleTriggerMouseLeave}
        onFocus={handleTriggerFocus}
        onBlur={handleTriggerBlur}
        onKeyDown={handleTriggerKeyDown}
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
      >
        <HelpCircle
          className={`w-3 h-3 opacity-60 transition-opacity duration-200 cursor-pointer hover:opacity-100 ${iconClassName ?? ""}`.trim()}
          aria-hidden="true"
        />
      </span>
      {isOpen &&
        createPortal(
          customTooltipText ? (
            // Simple tooltip for custom text
            <div
              style={{
                position: "fixed",
                top: position.top,
                left: position.left,
                zIndex: 10000,
                transform: 'translateX(-50%)',
                maxWidth: `calc(100vw - ${VIEWPORT_MARGIN * 2}px)`,
              }}
              onMouseEnter={clearHideTimer}
              onMouseLeave={scheduleClose}
              onFocus={clearHideTimer}
              onBlur={scheduleClose}
            >
              <div className={`${tooltips.base} pointer-events-auto opacity-100 whitespace-normal max-w-[320px] text-center px-3 py-2`}>
                {customTooltipText}
              </div>
            </div>
          ) : (
            // Full card for normal tool info
            <div
              style={{
                position: "absolute",
                top: position.top,
                left: position.left,
                zIndex: 10000,
              }}
            >
              <div
                ref={cardRef}
                className={`${glass.surface} pointer-events-auto w-[480px] max-w-[calc(100vw-2rem)] rounded-2xl border border-theme-dark/70 bg-theme-black/80 p-4 shadow-xl shadow-theme-black/50`}
                onMouseEnter={() => {
                  clearHideTimer();
                }}
                onMouseLeave={(event) => {
                  // Only close if we're not moving to the button
                  const relatedTarget = event.relatedTarget as HTMLElement;
                  if (!relatedTarget || !cardRef.current?.contains(relatedTarget)) {
                    scheduleClose();
                  }
                }}
                onFocus={clearHideTimer}
                onBlur={scheduleClose}
                role="dialog"
                aria-label={`${displayName} overview`}
              >
                <div className="flex items-start gap-3">
                  {logo ? (
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-theme-dark/60 bg-theme-black/60">
                      <img
                        src={logo}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-theme-dark/60 bg-theme-black/60 text-sm font-medium text-theme-white/80">
                      {displayName.charAt(0)}
                    </div>
                  )}
                  <div className="space-y-0">
                    <p className="font-raleway font-medium text-theme-text" style={{ fontSize: '0.875rem' }}>{displayName}</p>
                    <p className="font-raleway text-theme-white" style={{ fontSize: '0.75rem' }}>{tool.tagline}</p>
                  </div>
                </div>
                <p className="mt-2 font-raleway leading-relaxed text-theme-light" style={{ fontSize: '0.75rem' }}>
                  {tool.overview}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className={buttons.glassPromptCompact}
                    style={{ fontSize: '0.75rem', pointerEvents: 'auto', zIndex: 10001 }}
                    onClick={(event) => {
                      event.stopPropagation();
                      
                      // Create a temporary link and click it
                      const link = document.createElement('a');
                      link.href = knowledgeBasePath;
                      link.target = '_blank';
                      link.rel = 'noopener noreferrer';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      
                      setIsOpen(false);
                    }}
                    onMouseDown={(event) => {
                      event.stopPropagation();
                    }}
                  >
                    View full guide
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          ),
          document.body,
        )}
    </>
  );
}

export default ToolInfoHover;
