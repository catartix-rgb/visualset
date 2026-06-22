import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import { signals } from "@/lib/signals";

/**
 * Tracks FPS and automatically lowers the renderer DPR when frame-rate drops,
 * restoring it when there's headroom. Keeps the experience at ~60fps on weaker GPUs.
 */
export function useAdaptiveQuality(maxDpr = 2) {
  const gl = useThree((s) => s.gl);
  const acc = useRef({ t: 0, frames: 0, dpr: -1 });

  useFrame((_, delta) => {
    const a = acc.current;
    a.t += delta;
    a.frames += 1;
    if (a.t >= 0.5) {
      const fps = a.frames / a.t;
      signals.fps = fps;
      const base = Math.min(maxDpr, window.devicePixelRatio || 1);

      let target = signals.quality;
      if (fps < 45) target = Math.max(0.6, signals.quality - 0.15);
      else if (fps > 58) target = Math.min(1, signals.quality + 0.08);
      signals.quality = target;

      const dpr = base * target;
      if (Math.abs(dpr - a.dpr) > 0.05) {
        a.dpr = dpr;
        gl.setPixelRatio(dpr);
      }
      a.t = 0;
      a.frames = 0;
    }
  });
}
