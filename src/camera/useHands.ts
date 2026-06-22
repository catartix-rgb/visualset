import { useEffect } from "react";
import { getHandEngine } from "./HandEngine";
import { useStore } from "@/store/useStore";

/** Starts/stops MediaPipe hand tracking based on store `handsOn`. */
export function useHands() {
  const handsOn = useStore((s) => s.handsOn);

  useEffect(() => {
    const e = getHandEngine();
    if (handsOn) {
      useStore.getState().flash("Loading hand tracking…");
      e.start()
        .then(() => useStore.getState().flash("Hand tracking ready"))
        .catch((err) => {
          console.error(err);
          useStore.getState().flash("Hand tracking failed to load");
          useStore.getState().setHandsOn(false);
        });
    } else {
      e.stop();
    }
  }, [handsOn]);
}
