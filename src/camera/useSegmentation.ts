import { useEffect } from "react";
import { getSegmentationEngine } from "./SegmentationEngine";
import { useStore } from "@/store/useStore";

/**
 * Runs person segmentation only when it's actually needed: the camera is on and the
 * Silhouette Halftone mode is enabled. Lazy-loads the (heavy) MediaPipe segmenter on
 * demand and stops it when no longer required.
 */
export function useSegmentation() {
  const cameraOn = useStore((s) => s.cameraOn);
  const silhouette = useStore((s) => s.camfx.halftone.silhouette);
  const halftoneOn = useStore((s) => s.camfx.halftone.on);
  const sceneId = useStore((s) => s.sceneId);

  const need = cameraOn && sceneId === "camerafx" && halftoneOn && silhouette;

  useEffect(() => {
    const e = getSegmentationEngine();
    if (need) {
      e.start().catch((err) => console.error(err));
    } else {
      e.stop();
    }
    return () => {
      if (!useStore.getState().camfx.halftone.silhouette) e.stop();
    };
  }, [need]);
}
