import { useEffect } from "react";
import { getAudioEngine } from "./AudioEngine";
import { useStore } from "@/store/useStore";

/**
 * Bridges the audio engine to the store: starts/stops mic & file sources when the
 * user changes `audioSource`, and keeps the engine's gains in sync with the
 * AudioMapping sliders.
 */
export function useAudio() {
  const audioSource = useStore((s) => s.audioSource);
  const mapping = useStore((s) => s.audio);

  // keep gains live
  useEffect(() => {
    const e = getAudioEngine();
    e.reactivity = mapping.reactivity;
    e.bassGain = mapping.bassGain;
    e.midGain = mapping.midGain;
    e.trebleGain = mapping.trebleGain;
  }, [mapping]);

  // react to source changes (mic only; file is started explicitly on upload)
  useEffect(() => {
    const e = getAudioEngine();
    if (audioSource === "mic") {
      e.startMic().catch((err) => {
        console.error(err);
        useStore.getState().flash("Mic access denied");
        useStore.getState().setAudioSource("none");
      });
    } else if (audioSource === "none") {
      e.stop();
    }
    // file source handled in loadAudioFile()
  }, [audioSource]);

  return {
    loadFile: async (file: File) => {
      const e = getAudioEngine();
      try {
        await e.loadFile(file);
        useStore.getState().setAudioSource("file");
        useStore.getState().flash(`Playing ${file.name}`);
      } catch (err) {
        console.error(err);
        useStore.getState().flash("Could not load audio file");
      }
    },
    togglePlay: () => getAudioEngine().togglePlay(),
  };
}
