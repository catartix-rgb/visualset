import type { LyricLine } from "./types";

// Parse synced LRC ([mm:ss.xx] text, possibly multiple stamps per line) or plain text.

const LRC_TAG = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

export function parseLRC(raw: string): LyricLine[] {
  const out: LyricLine[] = [];
  for (const line of raw.split(/\r?\n/)) {
    LRC_TAG.lastIndex = 0;
    const stamps: number[] = [];
    let m: RegExpExecArray | null;
    while ((m = LRC_TAG.exec(line))) {
      const min = parseInt(m[1], 10);
      const sec = parseInt(m[2], 10);
      const frac = m[3] ? parseInt(m[3].padEnd(3, "0"), 10) / 1000 : 0;
      stamps.push(min * 60 + sec + frac);
    }
    const text = line.replace(LRC_TAG, "").trim();
    if (!text || stamps.length === 0) continue;
    for (const t of stamps) out.push({ time: t, text });
  }
  out.sort((a, b) => a.time - b.time);
  return out;
}

export function parsePlain(raw: string): LyricLine[] {
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((text) => ({ time: -1, text }));
}

/** True if the text contains LRC timestamps. */
export function isLRC(raw: string): boolean {
  LRC_TAG.lastIndex = 0;
  return LRC_TAG.test(raw);
}

/** Spread untimed lines evenly across a known duration so they still sync. */
export function distribute(lines: LyricLine[], duration: number): LyricLine[] {
  if (lines.length === 0 || duration <= 0) return lines;
  const span = duration * 0.92;
  const start = duration * 0.04;
  return lines.map((l, i) => ({
    ...l,
    time: start + (span * i) / Math.max(1, lines.length - 1),
  }));
}

export function parseLyrics(raw: string): { lines: LyricLine[]; synced: boolean } {
  if (isLRC(raw)) return { lines: parseLRC(raw), synced: true };
  return { lines: parsePlain(raw), synced: false };
}
