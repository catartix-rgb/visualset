"use client";
import { AnimatePresence, motion } from "framer-motion";

const KEYS: [string, string][] = [
  ["Space", "Generate new visual"],
  ["1 – 8", "Switch scene"],
  ["F", "Freeze / resume"],
  ["H", "Show / hide control panel"],
  ["P", "Performance (fullscreen, no UI)"],
  ["Esc", "Exit performance mode"],
  ["R", "Start / stop video recording"],
  ["S", "Save PNG snapshot"],
  ["M", "Toggle microphone"],
  ["C", "Toggle webcam"],
  ["?", "Toggle this help"],
];

export function HelpOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            className="glass w-[420px] max-w-[90vw] rounded-2xl p-6"
          >
            <h2 className="mb-1 text-lg font-bold tracking-[0.3em] text-accent">
              VISUAL<span className="text-accent2">SET</span>
            </h2>
            <p className="mb-4 text-xs leading-relaxed text-white/60">
              A generative audio-visual instrument. Feed it sound or your camera,
              hit Generate, and perform. Everything is reproducible from a seed.
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {KEYS.map(([k, d]) => (
                <div key={k} className="flex items-center justify-between text-xs">
                  <span className="text-white/70">{d}</span>
                  <kbd className="rounded-md border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-[11px] text-accent">
                    {k}
                  </kbd>
                </div>
              ))}
            </div>
            <button className="btn mt-5 w-full justify-center" onClick={onClose}>
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
