"use client";
import { useRef, useState } from "react";
import { useStore } from "@/store/useStore";
import { getAudioEngine } from "@/audio/AudioEngine";
import { parseLyrics, distribute } from "@/lyrics/parse";
import { detectLanguage } from "@/lyrics/lang";
import { buildWordCloud } from "@/lyrics/semantics";
import { LYRIC_MODES, type LyricMode } from "@/lyrics/types";

const MODE_LABELS: Record<LyricMode, string> = {
  particles: "Particles",
  flow: "Flow Field",
  halftone: "Halftone",
  clay: "Clay",
  noise: "Noise",
};

const DEMO = `[00:01.00] We are made of light and noise
[00:04.20] falling slow into the night
[00:07.50] water turns to fire in your eyes
[00:11.00] love will make us fly`;

export function LyricsPanel({ onClose }: { onClose: () => void }) {
  const lyrics = useStore((s) => s.lyrics);
  const setLyrics = useStore((s) => s.setLyrics);
  const [draft, setDraft] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = (raw: string) => {
    const { lines, synced } = parseLyrics(raw);
    if (lines.length === 0) {
      useStore.getState().flash("No lyrics found");
      return;
    }
    const dur = getAudioEngine().playDuration;
    const finalLines = synced ? lines : distribute(lines, dur || lines.length * 2.8);
    const lang = detectLanguage(lines.map((l) => l.text).join(" "));
    const cloud = buildWordCloud(finalLines);
    setLyrics({
      lines: finalLines,
      synced,
      lang: lang.name,
      cloud,
      index: -1,
      enabled: true,
    });
    useStore.getState().flash(`Lyrics loaded · ${lang.name} · ${finalLines.length} lines`);
  };

  return (
    <div className="panel pointer-events-auto absolute left-3 top-[150px] z-30 flex w-[260px] flex-col gap-2.5 p-3">
      <div className="flex items-center justify-between">
        <span className="label" style={{ letterSpacing: "0.18em" }}>Lyrics Engine</span>
        <button className="text-[var(--text-faint)] hover:text-[var(--text)]" onClick={onClose}>✕</button>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="btn flex-1 justify-center"
          data-active={lyrics.enabled ? "true" : "false"}
          onClick={() => setLyrics({ enabled: !lyrics.enabled })}
        >
          {lyrics.enabled ? "On" : "Off"}
        </button>
        <button className="btn flex-1 justify-center" onClick={() => load(DEMO)}>Demo</button>
      </div>

      <div className="flex items-center gap-2">
        <button className="btn flex-1 justify-center" onClick={() => fileRef.current?.click()}>Import .lrc / .txt</button>
      </div>

      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="…or paste lyrics here (plain text or LRC), then Apply"
        spellCheck={false}
        className="mono h-24 w-full resize-none rounded-md border border-[var(--hair)] bg-black/30 p-2 text-[11px] text-[var(--text)] outline-none focus:border-[var(--hair-strong)]"
      />
      <button className="btn justify-center border border-[var(--hair-strong)]" onClick={() => draft.trim() && load(draft)}>
        Apply pasted lyrics
      </button>

      <div>
        <span className="label mb-1 block">Visual mode</span>
        <div className="flex flex-wrap gap-1">
          {LYRIC_MODES.map((m) => (
            <button
              key={m}
              className="btn"
              style={{ height: 26, padding: "0 8px", fontSize: 11 }}
              data-active={lyrics.mode === m ? "true" : "false"}
              onClick={() => setLyrics({ mode: m })}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      <button
        className="btn justify-between"
        data-active={lyrics.auto ? "true" : "false"}
        onClick={() => setLyrics({ auto: !lyrics.auto })}
      >
        <span>Auto palette (meaning)</span>
        <span>{lyrics.auto ? "on" : "off"}</span>
      </button>

      <div className="flex items-center justify-between border-t border-[var(--hair)] pt-2 text-[11px] text-[var(--text-dim)]">
        <span className="label" style={{ fontSize: 9 }}>{lyrics.lang || "—"}</span>
        <span className="mono" style={{ color: "rgb(var(--accent))" }}>
          {lyrics.intent.theme || "neutral"}
        </span>
        <span className="label" style={{ fontSize: 9 }}>{lyrics.lines.length} ln</span>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".lrc,.txt,text/plain"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) load(await f.text());
        }}
      />
    </div>
  );
}
