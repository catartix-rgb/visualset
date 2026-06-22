"use client";
import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import { applyPreset, deletePreset, listPresets } from "@/presets/presets";
import type { Preset } from "@/lib/types";

/** Saved-preset rail (browser localStorage). Refreshes whenever a toast fires
 *  (cheap signal that something changed) and on mount. */
export function PresetShelf() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [open, setOpen] = useState(false);
  const toast = useStore((s) => s.toast);

  useEffect(() => setPresets(listPresets()), [toast]);

  if (presets.length === 0) return null;

  return (
    <div className="absolute bottom-3 right-3 z-30 flex max-w-[40vw] flex-col items-end gap-2">
      <button className="btn pointer-events-auto" onClick={() => setOpen((o) => !o)}>
        {open ? "▾ Presets" : `▸ Presets (${presets.length})`}
      </button>
      {open && (
        <div className="glass pointer-events-auto flex max-h-[40vh] flex-col gap-1 overflow-auto rounded-2xl p-2">
          {presets.map((p) => (
            <div key={p.createdAt} className="flex items-center gap-2">
              <button
                className="flex-1 rounded-lg px-2 py-1 text-left text-[11px] text-white/80 hover:bg-white/10"
                onClick={() => applyPreset(p)}
                title={`${p.sceneId} · seed ${p.seed}`}
              >
                <span className="text-accent">●</span> {p.name}
              </button>
              <button
                className="px-1 text-white/40 hover:text-red-400"
                onClick={() => {
                  deletePreset(p.createdAt);
                  setPresets(listPresets());
                }}
                title="Delete"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
