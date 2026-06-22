"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { CURATED } from "@/presets/curated";
import { applyPreset, deletePreset, listPresets } from "@/presets/presets";
import { useStore } from "@/store/useStore";
import type { Preset } from "@/lib/types";

export function PresetLibrary({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [saved, setSaved] = useState<Preset[]>([]);
  const toast = useStore((s) => s.toast);
  const activeSeed = useStore((s) => s.seed);

  useEffect(() => {
    if (open) setSaved(listPresets());
  }, [open, toast]);

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ x: -340, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -340, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="panel pointer-events-auto absolute left-3 top-[92px] z-40 flex max-h-[calc(100vh-120px)] w-[320px] flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-[var(--hair)] px-4 py-3">
            <span className="label">Preset Library</span>
            <button className="btn h-6 px-2 text-[var(--text-faint)]" onClick={onClose}>
              Close
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 py-2">
            <div className="px-2 pb-1.5 pt-1">
              <span className="label">Curated</span>
            </div>
            {CURATED.map((p) => {
              const active = activeSeed === p.state.seed;
              return (
                <button
                  key={p.name}
                  onClick={() => applyPreset(p.state)}
                  className="group mb-0.5 flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/[0.04]"
                  style={{ background: active ? "rgba(255,255,255,0.05)" : "transparent" }}
                >
                  <span className="flex items-center gap-2 text-[13px] text-[var(--text)]">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        background: `rgb(${p.state.params.colors[3].map((c) => Math.round(c * 255)).join(",")})`,
                      }}
                    />
                    {p.name}
                  </span>
                  <span className="pl-3.5 text-[11px] leading-snug text-[var(--text-faint)]">
                    {p.blurb}
                  </span>
                </button>
              );
            })}

            {saved.length > 0 && (
              <>
                <div className="px-2 pb-1.5 pt-3">
                  <span className="label">Your Presets</span>
                </div>
                {saved.map((p) => (
                  <div key={p.createdAt} className="flex items-center gap-1">
                    <button
                      onClick={() => applyPreset(p)}
                      className="flex-1 rounded-lg px-3 py-1.5 text-left text-[12px] text-[var(--text-dim)] hover:bg-white/[0.04] hover:text-[var(--text)]"
                      title={`${p.sceneId} · ${p.seed}`}
                    >
                      {p.name}
                    </button>
                    <button
                      className="px-2 py-1 text-[var(--text-faint)] hover:text-[#ff6b6b]"
                      onClick={() => {
                        deletePreset(p.createdAt);
                        setSaved(listPresets());
                      }}
                      title="Delete"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
