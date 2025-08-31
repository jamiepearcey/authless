"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "motion/react"; // or "framer-motion"
import { annotate } from "rough-notation";
import type React from "react";

type AnnotationAction =
  | "highlight"
  | "underline"
  | "box"
  | "circle"
  | "strike-through"
  | "crossed-off"
  | "bracket";

interface HighlighterProps {
  children: React.ReactNode;
  action?: AnnotationAction;
  color?: string;
  strokeWidth?: number;
  animationDuration?: number;
  iterations?: number;
  padding?: number;
  multiline?: boolean;
  /** If true, only show once it scrolls into view */
  isView?: boolean;

  /** === Defer options (choose any one or combine) === */

  /** Fixed delay before highlighting (ms) */
  startAfterMs?: number;

  /**
   * External gate: highlight when this becomes true
   * e.g. <motion.span onAnimationComplete={() => setReady(true)} />
   */
  startWhen?: boolean;

  /**
   * Auto-detect motion: wait until the element's rect is stable for N frames
   * (good when you can't wire onAnimationComplete)
   */
  waitForMotion?: boolean;
  stableFrames?: number;      // default 6 consecutive stable frames
  stableTolerancePx?: number; // default 0.5px delta tolerance
}

export function Highlighter({
  children,
  action = "highlight",
  color = "#ffd1dc",
  strokeWidth = 1.5,
  animationDuration = 600,
  iterations = 2,
  padding = 2,
  multiline = true,
  isView = false,

  startAfterMs,
  startWhen,
  waitForMotion,
  stableFrames = 6,
  stableTolerancePx = 0.5,
}: HighlighterProps) {
  const elementRef = useRef<HTMLSpanElement>(null);
  const annotationRef = useRef<any | null>(null);
  const [timeGate, setTimeGate] = useState(!startAfterMs); // opens immediately if no delay
  const inView = useInView(elementRef, { once: true, margin: "-10%" });
  const shouldShow = (!isView || inView) && timeGate && (startWhen ?? true);

  // Simple time delay gate
  useEffect(() => {
    if (!startAfterMs) return;
    const id = window.setTimeout(() => setTimeGate(true), startAfterMs);
    return () => clearTimeout(id);
  }, [startAfterMs]);

  // Wait for motion to stop (rect stable for N frames)
  const [motionGate, setMotionGate] = useState(!waitForMotion);
  useEffect(() => {
    if (!waitForMotion) return;
    let raf = 0;
    let stableCount = 0;
    let last: DOMRect | null = null;

    const tick = () => {
      const el = elementRef.current;
      if (!el) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const r = el.getBoundingClientRect();
      if (last) {
        const dx = Math.abs(r.x - last.x);
        const dy = Math.abs(r.y - last.y);
        const dw = Math.abs(r.width - last.width);
        const dh = Math.abs(r.height - last.height);
        const stable =
          dx < stableTolerancePx &&
          dy < stableTolerancePx &&
          dw < stableTolerancePx &&
          dh < stableTolerancePx;
        stableCount = stable ? stableCount + 1 : 0;
      }
      last = r;
      if (stableCount >= stableFrames) {
        setMotionGate(true);
      } else {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [waitForMotion, stableFrames, stableTolerancePx]);

  const ready = shouldShow && motionGate;

  useEffect(() => {
    if (!ready) return;

    const el = elementRef.current;
    if (!el) return;

    // If an annotation already exists (due to prop changes), remove it first
    if (annotationRef.current) {
      annotationRef.current.remove();
      annotationRef.current = null;
    }

    const a = annotate(el, {
      type: action,
      color,
      strokeWidth,
      animationDuration,
      iterations,
      padding,
      multiline,
    });

    annotationRef.current = a;
    // Defer 1 frame so any last transform/layout settles
    const id = requestAnimationFrame(() => a.show());

    return () => {
      cancelAnimationFrame(id);
      annotationRef.current?.remove();
      annotationRef.current = null;
    };
  }, [
    ready,
    action,
    color,
    strokeWidth,
    animationDuration,
    iterations,
    padding,
    multiline,
  ]);

  return (
    <span ref={elementRef} className="relative inline-block bg-transparent">
      {children}
    </span>
  );
}