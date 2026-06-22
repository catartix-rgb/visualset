"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useStore } from "@/store/useStore";

export function Toast() {
  const toast = useStore((s) => s.toast);
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="glass pointer-events-none absolute bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full px-4 py-2 text-xs tracking-wide text-white/90"
        >
          {toast}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
