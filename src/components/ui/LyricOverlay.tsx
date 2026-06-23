"use client";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { useEffect, useMemo, useRef } from "react";
import { useStore } from "@/store/useStore";
import { signals } from "@/lib/signals";
import type { LyricMode, LyricIntent } from "@/lyrics/types";

// Artistic lyric typography. The active line is split into letters and animated with a
// per-mode entrance (particles scatter, flow drift, halftone dots, clay inflate, noise
// dissolve). The whole line reacts to audio in real time (bass scale, mid skew, treble
// shimmer) via a rAF that writes CSS — never re-rendering React. The semantic intent
// drives a continuous motion (fall/fly/wave/flicker/dim/soft/burst). A faint word cloud
// of the song's recurring words floats behind, lighting up when sung.

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

const letterVariants = (mode: LyricMode): Variants => {
  switch (mode) {
    case "particles":
      return {
        initial: (i: number) => ({ opacity: 0, x: (hash("x" + i) % 200) - 100, y: (hash("y" + i) % 160) - 80, scale: 0.4, filter: "blur(3px)" }),
        animate: { opacity: 1, x: 0, y: 0, scale: 1, filter: "blur(0px)", transition: { type: "spring", stiffness: 220, damping: 18 } },
        exit: (i: number) => ({ opacity: 0, x: (hash("ex" + i) % 240) - 120, y: (hash("ey" + i) % 200) - 100, scale: 0.3, transition: { duration: 0.5 } }),
      };
    case "flow":
      return {
        initial: { opacity: 0, x: -40, filter: "blur(4px)" },
        animate: { opacity: 1, x: 0, filter: "blur(0px)", transition: { type: "spring", stiffness: 120, damping: 20 } },
        exit: { opacity: 0, x: 50, filter: "blur(4px)", transition: { duration: 0.45 } },
      };
    case "clay":
      return {
        initial: { opacity: 0, scale: 0.5, y: 16 },
        animate: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 160, damping: 12 } },
        exit: { opacity: 0, scale: 0.7, transition: { duration: 0.4 } },
      };
    case "noise":
      return {
        initial: { opacity: 0, filter: "blur(14px)", scale: 1.1 },
        animate: { opacity: 1, filter: "blur(0px)", scale: 1, transition: { duration: 0.7 } },
        exit: { opacity: 0, filter: "blur(16px)", transition: { duration: 0.6 } },
      };
    default: // halftone
      return {
        initial: { opacity: 0, scale: 0.85 },
        animate: { opacity: 1, scale: 1, transition: { duration: 0.5 } },
        exit: { opacity: 0, scale: 0.9, transition: { duration: 0.4 } },
      };
  }
};

function letterStyle(mode: LyricMode): React.CSSProperties {
  if (mode === "halftone") {
    return {
      color: "transparent",
      backgroundImage: "radial-gradient(rgb(var(--accent)) 32%, transparent 36%)",
      backgroundSize: "0.16em 0.16em",
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
    };
  }
  if (mode === "clay") {
    return { color: "rgb(var(--accent))", textShadow: "0 2px 0 rgba(0,0,0,0.35), 0 6px 18px rgba(0,0,0,0.4)" };
  }
  return { color: "rgb(var(--accent))" };
}

export function LyricOverlay() {
  const enabled = useStore((s) => s.lyrics.enabled);
  const mode = useStore((s) => s.lyrics.mode);
  const index = useStore((s) => s.lyrics.index);
  const lines = useStore((s) => s.lyrics.lines);
  const intent = useStore((s) => s.lyrics.intent);
  const cloud = useStore((s) => s.lyrics.cloud);

  const lineRef = useRef<HTMLDivElement>(null);
  const text = index >= 0 && index < lines.length ? lines[index].text : "";

  const currentWords = useMemo(() => new Set(text.toLowerCase().split(/[^\p{L}]+/u)), [text]);

  // audio + intent reactivity, written straight to CSS (no React re-render)
  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const tick = () => {
      const el = lineRef.current;
      if (el) {
        const t = signals.time || performance.now() / 1000;
        const bass = signals.bass, mid = signals.mid, treb = signals.treble;
        let dx = 0, dy = 0, op = 1, extra = 1;
        switch (intent.motion) {
          case "down": dy = 40 + bass * 30; break;
          case "up": dy = -40 - bass * 30; break;
          case "wave": dy = Math.sin(t * 1.6) * 22; dx = Math.cos(t * 1.1) * 14; break;
          case "flicker": op = 0.6 + 0.4 * Math.abs(Math.sin(t * 9.0)) * (0.5 + treb); break;
          case "dim": op = 0.5; break;
          case "burst": extra = 1.0 + bass * 0.3; break;
          case "soft": dy = Math.sin(t * 0.8) * 8; break;
        }
        const scale = (1 + bass * 0.18) * extra;
        const skew = mid * 6;
        el.style.transform = `translate(${dx}px, ${dy}px) scale(${scale}) skewX(${skew}deg)`;
        el.style.opacity = String(op);
        el.style.letterSpacing = `${0.02 + bass * 0.12}em`;
        el.style.textShadow = `0 0 ${6 + treb * 30}px rgb(var(--accent) / ${0.25 + treb * 0.5})`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled, intent.motion]);

  if (!enabled) return null;
  const variants = letterVariants(mode);
  const lstyle = letterStyle(mode);

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {/* dynamic word cloud */}
      {cloud.map(({ w, n }) => {
        const h = hash(w);
        const x = 6 + (h % 88);
        const y = 12 + ((h >> 7) % 76);
        const active = currentWords.has(w);
        const size = 11 + Math.min(5, n) * 4;
        return (
          <span
            key={w}
            className="mono absolute -translate-x-1/2 -translate-y-1/2 select-none uppercase"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              fontSize: active ? size * 1.5 : size,
              letterSpacing: "0.15em",
              color: active ? "rgb(var(--accent))" : "var(--text)",
              opacity: active ? 0.55 : 0.06 + Math.min(0.12, n * 0.02),
              transition: "opacity 0.4s ease, font-size 0.4s ease",
              fontWeight: active ? 700 : 400,
            }}
          >
            {w}
          </span>
        );
      })}

      {/* current line */}
      <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-center px-[8%]">
        <div
          ref={lineRef}
          className="flex max-w-[90%] flex-wrap items-center justify-center gap-x-[0.28em] gap-y-2 text-center"
          style={{ willChange: "transform, opacity" }}
        >
          <AnimatePresence mode="wait">
            <motion.div key={index} className="flex flex-wrap items-center justify-center gap-x-[0.28em]">
              {text.split(/(\s+)/).map((word, wi) =>
                word.trim() === "" ? (
                  <span key={`s${wi}`} className="w-2" />
                ) : (
                  <span key={`w${wi}`} className="inline-flex whitespace-nowrap">
                    {word.split("").map((ch, ci) => (
                      <motion.span
                        key={ci}
                        custom={wi * 17 + ci}
                        variants={variants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="inline-block font-semibold"
                        style={{
                          fontSize: "clamp(28px, 6vw, 84px)",
                          lineHeight: 1.05,
                          letterSpacing: "-0.01em",
                          ...lstyle,
                        }}
                      >
                        {ch}
                      </motion.span>
                    ))}
                  </span>
                )
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
