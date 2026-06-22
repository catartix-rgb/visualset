"use client";
import { useEffect, useRef } from "react";
import { signals } from "@/lib/signals";

/** Minimal live readout of audio bands, FPS and hand tracking. Reads the signals
 *  bus on its own rAF so it never triggers React re-renders. */
export function Meters() {
  const bass = useRef<HTMLDivElement>(null);
  const mid = useRef<HTMLDivElement>(null);
  const treble = useRef<HTMLDivElement>(null);
  const rms = useRef<HTMLDivElement>(null);
  const fps = useRef<HTMLSpanElement>(null);
  const beat = useRef<HTMLDivElement>(null);
  const hands = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (bass.current) bass.current.style.transform = `scaleY(${signals.bass})`;
      if (mid.current) mid.current.style.transform = `scaleY(${signals.mid})`;
      if (treble.current) treble.current.style.transform = `scaleY(${signals.treble})`;
      if (rms.current) rms.current.style.transform = `scaleY(${signals.rms})`;
      if (fps.current) fps.current.textContent = `${Math.round(signals.fps)}`;
      if (beat.current) beat.current.style.opacity = `${0.15 + signals.beat * 0.85}`;
      if (hands.current) {
        const h = signals.hands;
        hands.current.textContent = h.active
          ? h.count === 0
            ? "—"
            : `${h.count} ${h.count === 1 ? (h.h0.open > 0.5 ? "open" : "fist") : "tracked"}`
          : "off";
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const Bar = ({ label, r }: { label: string; r: React.RefObject<HTMLDivElement | null> }) => (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative h-10 w-[3px] overflow-hidden rounded-full bg-white/[0.08]">
        <div
          ref={r}
          className="absolute bottom-0 left-0 w-full origin-bottom rounded-full"
          style={{ height: "100%", background: "rgb(var(--accent))", transform: "scaleY(0)" }}
        />
      </div>
      <span className="label" style={{ fontSize: 9 }}>{label}</span>
    </div>
  );

  return (
    <div className="panel pointer-events-none absolute bottom-3 left-3 z-30 flex items-end gap-3 px-3.5 py-2.5">
      <div ref={beat} className="mb-3 h-1.5 w-1.5 rounded-full" style={{ background: "rgb(var(--accent))", opacity: 0.15 }} />
      <Bar label="bass" r={bass} />
      <Bar label="mid" r={mid} />
      <Bar label="treb" r={treble} />
      <Bar label="rms" r={rms} />
      <div className="ml-1 flex flex-col items-start gap-1 self-stretch border-l border-[var(--hair)] pl-3">
        <div className="flex items-baseline gap-1">
          <span ref={fps} className="mono text-[12px] text-[var(--text-dim)]">60</span>
          <span className="label" style={{ fontSize: 9 }}>fps</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span ref={hands} className="mono text-[11px] text-[var(--text-dim)]">off</span>
          <span className="label" style={{ fontSize: 9 }}>hands</span>
        </div>
      </div>
    </div>
  );
}
