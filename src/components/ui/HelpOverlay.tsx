"use client";
import { AnimatePresence, motion } from "framer-motion";

const KEYS: [string, string][] = [
  ["Space", "Generate new visual"],
  ["1 – 8", "Switch scene"],
  ["F", "Freeze / resume"],
  ["H", "Show / hide controls"],
  ["P", "Performance mode"],
  ["Esc", "Exit performance"],
  ["R", "Record video"],
  ["S", "Save PNG"],
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
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.98, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.98, y: 8 }}
            onClick={(e) => e.stopPropagation()}
            className="panel w-[440px] max-w-[90vw] p-7"
          >
            <div className="mb-1 text-[13px] font-semibold tracking-[0.28em]">VISUALSET</div>
            <p className="mb-6 max-w-[36ch] text-[12px] leading-relaxed text-[var(--text-dim)]">
              A generative audio-visual instrument. Feed it sound, your camera or your
              hands, then sculpt the result in real time. Every look is reproducible
              from a seed.
            </p>
            <div className="grid grid-cols-1 gap-2">
              {KEYS.map(([k, d]) => (
                <div key={k} className="flex items-center justify-between text-[12px]">
                  <span className="text-[var(--text-dim)]">{d}</span>
                  <kbd className="mono rounded-md border border-[var(--hair-strong)] px-2 py-0.5 text-[11px] text-[var(--text)]">
                    {k}
                  </kbd>
                </div>
              ))}
            </div>
            <button className="btn mt-6 w-full justify-center border border-[var(--hair-strong)]" onClick={onClose}>
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
