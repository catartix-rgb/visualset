import { useEffect } from "react";
import { getWebcamEngine } from "./WebcamEngine";
import { useStore } from "@/store/useStore";

/** Starts/stops the webcam based on store `cameraOn` and syncs mapping gains. */
export function useWebcam() {
  const cameraOn = useStore((s) => s.cameraOn);
  const camMap = useStore((s) => s.camera);

  useEffect(() => {
    getWebcamEngine().motionToForce = camMap.motionToForce;
  }, [camMap.motionToForce]);

  useEffect(() => {
    const e = getWebcamEngine();
    if (cameraOn) {
      e.start().catch((err) => {
        console.error(err);
        useStore.getState().flash("Camera access denied");
        useStore.getState().setCameraOn(false);
      });
    } else {
      e.stop();
    }
    return () => {
      if (!useStore.getState().cameraOn) e.stop();
    };
  }, [cameraOn]);
}
