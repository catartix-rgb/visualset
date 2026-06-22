"use client";
import { useRef, useState } from "react";
import { useStore } from "@/store/useStore";
import { CAMFX_LABELS, type CamFxStage } from "@/lib/fx";

/**
 * The Camera FX chain editor. "Raw Camera" is the fixed source; every effect below is
 * an independent module with an ON/OFF checkbox, and the whole list can be reordered
 * by drag & drop — so the processing order (e.g. Halftone -> Dither vs Dither ->
 * Halftone) is fully under the user's control, like a TouchDesigner node chain.
 */
export function CameraFXChain() {
  const order = useStore((s) => s.camfxOrder);
  const camfx = useStore((s) => s.camfx);
  const setCamFx = useStore((s) => s.setCamFx);
  const setCamfxOrder = useStore((s) => s.setCamfxOrder);
  const dragFrom = useRef<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const move = (from: number, to: number) => {
    if (from === to) return;
    const next = [...order];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setCamfxOrder(next);
  };

  return (
    <div className="panel pointer-events-auto absolute left-3 top-[150px] z-30 w-[208px] p-2.5">
      <div className="label mb-2 px-1" style={{ letterSpacing: "0.18em" }}>
        FX Chain
      </div>

      <div className="mb-1.5 flex items-center gap-2 rounded-md border border-[var(--hair)] px-2 py-1.5 text-[11px] text-[var(--text-dim)]">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: "rgb(var(--accent))" }} />
        Raw Camera
        <span className="ml-auto label" style={{ fontSize: 9 }}>source</span>
      </div>

      <div className="flex flex-col gap-0.5">
        {order.map((stage, i) => {
          const on = camfx[stage].on;
          return (
            <div
              key={stage}
              draggable
              onDragStart={() => (dragFrom.current = i)}
              onDragOver={(e) => {
                e.preventDefault();
                setOverIndex(i);
              }}
              onDrop={() => {
                if (dragFrom.current !== null) move(dragFrom.current, i);
                dragFrom.current = null;
                setOverIndex(null);
              }}
              onDragEnd={() => {
                dragFrom.current = null;
                setOverIndex(null);
              }}
              className="flex cursor-grab items-center gap-2 rounded-md px-2 py-1.5 text-[11px] transition-colors active:cursor-grabbing"
              style={{
                background: overIndex === i ? "rgba(255,255,255,0.07)" : "transparent",
                color: on ? "var(--text)" : "var(--text-faint)",
                borderTop: overIndex === i ? "1px solid rgb(var(--accent))" : "1px solid transparent",
              }}
            >
              <span
                className="select-none leading-none tracking-tighter text-[var(--text-faint)]"
                style={{ fontSize: 12 }}
                title="Drag to reorder"
              >
                ::
              </span>
              <button
                onClick={() => setCamFx(stage as CamFxStage, { on: !on } as never)}
                className="flex h-3.5 w-3.5 items-center justify-center rounded-[3px] border"
                style={{
                  borderColor: on ? "rgb(var(--accent))" : "var(--hair-strong)",
                  background: on ? "rgb(var(--accent))" : "transparent",
                }}
                title={on ? "Disable" : "Enable"}
              >
                {on && (
                  <span className="block h-1.5 w-1.5 rounded-[1px]" style={{ background: "var(--bg)" }} />
                )}
              </button>
              <span className="flex-1">{CAMFX_LABELS[stage]}</span>
            </div>
          );
        })}
      </div>

      <div className="label mt-2 px-1 leading-relaxed text-[var(--text-faint)]" style={{ fontSize: 9 }}>
        drag to reorder · params in Controls
      </div>
    </div>
  );
}
