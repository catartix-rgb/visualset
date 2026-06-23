// Lyrics Engine data model.

export type LyricMode = "particles" | "flow" | "halftone" | "clay" | "noise";

export const LYRIC_MODES: LyricMode[] = ["particles", "flow", "halftone", "clay", "noise"];

/** One lyric line. `time` is seconds (LRC); -1 means untimed (distributed later). */
export interface LyricLine {
  time: number;
  text: string;
}

/** Artistic, non-literal response derived from the meaning of the current line. */
export interface LyricIntent {
  theme: string; // e.g. "water", "fire", "love", "" when neutral
  palette: string | null; // a curated palette name to bias toward
  motion: "none" | "down" | "up" | "wave" | "flicker" | "dim" | "soft" | "burst";
  warmth: number; // -1 cold .. +1 warm
  energy: number; // 0 calm .. 1 intense
}

export const NEUTRAL_INTENT: LyricIntent = {
  theme: "",
  palette: null,
  motion: "none",
  warmth: 0,
  energy: 0.4,
};
