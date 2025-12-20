import type React from "react";
import { useCallback, useMemo } from "react";

type PointerType = "mouse" | "pen" | "touch" | "unknown" | string;

export interface ParallaxHoverOptions {
  /**
   * Controls the strength of the translation applied via `--tx`/`--ty`.
   * Matches the existing implementation which divided the delta by 10.
   */
  intensity?: number;
  /** CSS transition duration applied on pointer enter. */
  enterFadeMs?: string;
  /** CSS transition duration applied on pointer leave. */
  leaveFadeMs?: string;
  /** Value assigned to `--l` on pointer enter. */
  enterLight?: string;
  /** Value assigned to `--l` on pointer leave. */
  leaveLight?: string;
  /**
   * When true, resets the position related CSS variables on pointer leave
   * (used by FAQ cards).
   */
  resetOnLeave?: boolean;
  /** Allowed pointer types. Defaults to fine pointers only. */
  pointerTypes?: readonly PointerType[];
}

const DEFAULT_POINTER_TYPES = ["mouse", "pen"] as const;
const DEFAULT_OPTIONS: Required<Omit<ParallaxHoverOptions, "pointerTypes">> = {
  intensity: 10,
  enterFadeMs: "200ms",
  leaveFadeMs: "400ms",
  enterLight: "1",
  leaveLight: "0",
  resetOnLeave: false,
};

type HandlerTarget = HTMLElement & { style: CSSStyleDeclaration };

const toFixed = (value: number) => value.toFixed(2);

export function useParallaxHover<T extends HTMLElement = HTMLDivElement>(
  options: ParallaxHoverOptions = {},
): {
  onPointerMove: React.PointerEventHandler<T>;
  onPointerEnter: React.PointerEventHandler<T>;
  onPointerLeave: React.PointerEventHandler<T>;
} {
  const {
    intensity,
    enterFadeMs,
    leaveFadeMs,
    enterLight,
    leaveLight,
    resetOnLeave,
  } = { ...DEFAULT_OPTIONS, ...options };

  const effectiveIntensity = intensity === 0 ? DEFAULT_OPTIONS.intensity : intensity;

  const pointerTypes = options.pointerTypes ?? DEFAULT_POINTER_TYPES;

  const pointerTypeSet = useMemo(() => {
    return new Set(pointerTypes);
  }, [pointerTypes]);

  const isAllowedPointer = useCallback(
    (pointerType: PointerType) => pointerTypeSet.has(pointerType),
    [pointerTypeSet],
  );

  const onPointerMove = useCallback<React.PointerEventHandler<T>>(
    event => {
      if (!isAllowedPointer(event.pointerType)) {
        return;
      }

      const el = event.currentTarget as unknown as HandlerTarget;
      const rect = el.getBoundingClientRect();

      if (!rect.width || !rect.height) {
        return;
      }

      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;

      el.style.setProperty("--x", `${toFixed(x)}%`);
      el.style.setProperty("--y", `${toFixed(y)}%`);

      const tx = (x - 50) / effectiveIntensity;
      const ty = (y - 50) / effectiveIntensity;

      const rotateY = ((x - 50) / 100) * 10; // Max 10deg tilt
      const rotateX = -((y - 50) / 100) * 10; // Max 10deg tilt

      el.style.setProperty("--tx", `${toFixed(tx)}px`);
      el.style.setProperty("--ty", `${toFixed(ty)}px`);
      el.style.setProperty("--rotate-x", `${toFixed(rotateX)}deg`);
      el.style.setProperty("--rotate-y", `${toFixed(rotateY)}deg`);
    },
    [effectiveIntensity, isAllowedPointer],
  );

  const onPointerEnter = useCallback<React.PointerEventHandler<T>>(
    event => {
      if (!isAllowedPointer(event.pointerType)) {
        return;
      }

      const el = event.currentTarget as unknown as HandlerTarget;

      el.style.setProperty("--fade-ms", enterFadeMs);
      el.style.setProperty("--l", enterLight);
    },
    [enterFadeMs, enterLight, isAllowedPointer],
  );

  const onPointerLeave = useCallback<React.PointerEventHandler<T>>(
    event => {
      if (!isAllowedPointer(event.pointerType)) {
        return;
      }

      const el = event.currentTarget as unknown as HandlerTarget;

      el.style.setProperty("--fade-ms", leaveFadeMs);
      el.style.setProperty("--l", leaveLight);

      if (resetOnLeave) {
        el.style.setProperty("--x", "50%");
        el.style.setProperty("--y", "50%");
        el.style.setProperty("--tx", "0px");
        el.style.setProperty("--ty", "0px");
        el.style.setProperty("--rotate-x", "0deg");
        el.style.setProperty("--rotate-y", "0deg");
      }
    },
    [isAllowedPointer, leaveFadeMs, leaveLight, resetOnLeave],
  );

  return { onPointerMove, onPointerEnter, onPointerLeave };
}

export default useParallaxHover;
