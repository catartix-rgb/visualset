import { useEffect, useRef } from "react";
import { useStore } from "@/store/useStore";
import { getAudioEngine } from "@/audio/AudioEngine";
import { analyzeLine } from "./semantics";
import { paletteByName } from "@/lib/palettes";

const SECONDS_PER_LINE = 2.8; // fallback pacing when there's no audio timeline

/**
 * Syncs the current lyric line to playback and applies its artistic intent. Uses the
 * audio file's timeline when available (LRC or distributed times), otherwise paces by
 * wall-clock so pasted lyrics still flow. Per line it analyses meaning and, when "auto"
 * is on, gently biases the palette toward the detected mood.
 */
export function useLyrics() {
  const enabled = useStore((s) => s.lyrics.enabled);
  const lines = useStore((s) => s.lyrics.lines);
  const lastTheme = useRef<string>("");
  const startedAt = useRef<number>(0);

  useEffect(() => {
    lastTheme.current = "";
    startedAt.current = performance.now();
  }, [lines]);

  useEffect(() => {
    if (!enabled || lines.length === 0) return;
    let raf = 0;
    const eng = getAudioEngine();

    const tick = () => {
      const timed = lines[0].time >= 0;
      const t = eng.hasTimeline
        ? eng.playTime
        : (performance.now() - startedAt.current) / 1000;

      let idx: number;
      if (timed) {
        idx = 0;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].time <= t) idx = i;
          else break;
        }
      } else {
        idx = Math.min(lines.length - 1, Math.floor(t / SECONDS_PER_LINE));
      }

      const s = useStore.getState();
      if (idx !== s.lyrics.index && idx >= 0) {
        const intent = analyzeLine(lines[idx].text);
        useStore.getState().setLyrics({ index: idx, intent });

        // bias the palette when the mood/theme changes (a soft scene-wide colour shift)
        if (s.lyrics.auto && intent.palette && intent.theme !== lastTheme.current) {
          lastTheme.current = intent.theme;
          const pal = paletteByName(intent.palette);
          useStore.getState().setParams({
            paletteName: pal.name,
            colors: pal.colors,
            bg: pal.colors[0],
          });
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled, lines]);
}
