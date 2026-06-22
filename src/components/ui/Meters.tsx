"use client";
import { useEffect, useRef } from "react";
import { signals } from "@/lib/signals";

/** Live readout of the audio bands + FPS. Reads the signals bus on its own rAF so
 *  it never triggers React re-renders. */
export function Meters() {
  const bass = useRef<HTMLDivElement>(null);
  const mid = useRef<HTMLDivElement>(null);
  const treble = useRef<HTMLDivElement>(null);
  const rms = useRef<HTMLDivElement>(null);
  const fps = useRef<HTMLSpanElement>(null);
  const beat = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (bass.current) bass.current.style.transform = `scaleY(${signals.bass})`;
      if (mid.current) mid.current.style.transform = `scaleY(${signals.mid})`;
      if (treble.current) treble.current.style.transform = `scaleY(${signals.treble})`;
      if (rms.current) rms.current.style.transform = `scaleY(${signals.rms})`;
      if (fps.current) fps.current.textContent = `${Math.round(signals.fps)} fps`;
      if (beat.current) beat.current.style.opacity = `${signals.beat}`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const Bar = ({ label, r, color }: { label: string; r: React.RefObject<HTMLDivElement | null>; color: string }) => (
    <div className="flex flex-col items-center gap-1">
      <div className="relative h-12 w-2 overflow-hidden rounded-full bg-white/10">
        <div
          ref={r}
          className="absolute bottom-0 left-0 w-full origin-bottom rounded-full"
          style={{ height: "100%", background: color, transform: "scaleY(0)" }}
        />
      </div>
      <span className="text-[9px] uppercase tracking-wider text-white/50">{label}</span>
    </div>
  );

  return (
    <div className="glass pointer-events-none absolute bottom-3 left-3 z-30 flex items-end gap-3 rounded-2xl px-3 py-2">
      <div ref={beat} className="mr-1 h-3 w-3 self-center rounded-full bg-accent" style={{ opacity: 0 }} />
      <Bar label="bass" r={bass} color="#5eead4" />
      <Bar label="mid" r={mid} color="#a78bfa" />
      <Bar label="treb" r={treble} color="#ff6ec7" />
      <Bar label="rms" r={rms} color="#ffd60a" />
      <span ref={fps} className="self-center text-[10px] tabular-nums text-white/50">
        60 fps
      </span>
    </div>
  );
}
