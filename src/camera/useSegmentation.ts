import { useEffect } from "react";
import { getSegmentationEngine } from "./SegmentationEngine";
import { useStore } from "@/store/useStore";

/**
 * Runs person segmentation only when needed: Silhouette Halftone, or the camera-based
 * Clay modes (Clay Camera / Clay Halftone). Lazy-loads the MediaPipe segmenter and
 * auto-enables the webcam for those modes; stops everything when no longer required.
 */
export function useSegmentation() {
  const cameraOn = useStore((s) => s.cameraOn);
  const setCameraOn = useStore((s) => s.setCameraOn);
  const silhouette = useStore((s) => s.camfx.halftone.silhouette);
  const halftoneOn = useStore((s) => s.camfx.halftone.on);
  const clayMode = useStore((s) => s.clay.mode);
  const sceneId = useStore((s) => s.sceneId);

  const wantsCamera =
    (sceneId === "camerafx" && halftoneOn && silhouette) ||
    (sceneId === "clay" && clayMode > 0);

  // auto-enable the webcam for camera-driven modes
  useEffect(() => {
    if (wantsCamera && !cameraOn) setCameraOn(true);
  }, [wantsCamera, cameraOn, setCameraOn]);

  useEffect(() => {
    const e = getSegmentationEngine();
    if (wantsCamera && cameraOn) {
      e.start().catch((err) => console.error(err));
    } else {
      e.stop();
    }
    return () => {
      const s = useStore.getState();
      const still =
        (s.sceneId === "camerafx" && s.camfx.halftone.on && s.camfx.halftone.silhouette) ||
        (s.sceneId === "clay" && s.clay.mode > 0);
      if (!still) e.stop();
    };
  }, [wantsCamera, cameraOn]);
}
