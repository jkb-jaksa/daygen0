import { type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { ArrowUpRight, HelpCircle } from "lucide-react";
import { glass } from "../styles/designSystem";
import {
  buildFallbackTool,
  getLearnToolByName,
} from "../data/learnTools";
import { getToolLogo } from "../utils/toolLogos";

const CARD_WIDTH = 320;
const DEFAULT_CARD_HEIGHT = 240;
const VIEWPORT_MARGIN = 16;
const TRIGGER_SPACING = 12;

export type ToolInfoHoverProps = {
  toolName: string;
  className?: string;
  iconClassName?: string;
};

export function ToolInfoHover({ toolName, className, iconClassName }: ToolInfoHoverProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<number>();
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const tool = useMemo(() => {
    const match = getLearnToolByName(toolName);
    return match ?? buildFallbackTool(toolName);
  }, [toolName]);

  const logo = useMemo(() => getToolLogo(tool.name), [tool.name]);
  const knowledgeBasePath = `/learn/tools/${tool.slug}`;
  const toolsPath = `/tools/${tool.slug}`;

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
    const width = cardRef.current?.offsetWidth ?? CARD_WIDTH;
    const height = cardRef.current?.offsetHeight ?? DEFAULT_CARD_HEIGHT;

    let left = rect.left + scrollX + rect.width / 2 - width / 2;
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
  }, []);

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
        aria-label={`Learn more about ${tool.name}`}
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
          <div
            style={{
              position: "absolute",
              top: position.top,
              left: position.left,
              zIndex: 10000,
              pointerEvents: "none",
            }}
          >
            <div
              ref={cardRef}
              className={`${glass.surface} pointer-events-auto w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-d-dark/70 bg-d-black/80 p-4 shadow-xl shadow-d-black/50`}
              onMouseEnter={() => {
                clearHideTimer();
              }}
              onMouseLeave={scheduleClose}
              onFocus={clearHideTimer}
              onBlur={scheduleClose}
              role="dialog"
              aria-label={`${tool.name} overview`}
            >
              <div className="flex items-start gap-3">
                {logo ? (
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-d-dark/60 bg-d-black/60">
                    <img src={logo} alt="" className="h-full w-full object-contain" />
                  </div>
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-d-dark/60 bg-d-black/60 text-sm font-semibold text-d-white/80">
                    {tool.name.charAt(0)}
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-sm font-raleway font-medium text-d-text">{tool.name}</p>
                  <p className="text-xs font-raleway text-d-white/70">{tool.tagline}</p>
                </div>
              </div>
              <p className="mt-3 text-xs font-raleway leading-relaxed text-d-white/80">
                {tool.overview}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Link
                  to={knowledgeBasePath}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-d-dark/60 bg-d-black/40 px-3 py-1 text-xs font-raleway text-d-white/80 transition-colors duration-150 hover:border-d-mid hover:text-d-text"
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsOpen(false);
                  }}
                >
                  View full guide
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
                <a
                  href={toolsPath}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-transparent bg-transparent px-2 py-1 text-[11px] font-raleway uppercase tracking-[0.2em] text-d-white/50 transition-colors duration-150 hover:text-d-text"
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsOpen(false);
                  }}
                >
                  tools/{tool.slug}
                  <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

export default ToolInfoHover;
