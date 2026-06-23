"use client";
import { useRef } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/store/useStore";
import { SCENES } from "@/lib/types";
import { useAudio } from "@/audio/useAudio";
import { useRecorder } from "@/hooks/useRecorder";
import { exportPresetFile, importPresetFile, savePreset } from "@/presets/presets";

function Btn({
  children,
  active,
  accent,
  rec,
  onClick,
  title,
}: {
  children: React.ReactNode;
  active?: boolean;
  accent?: boolean;
  rec?: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      className={`btn${accent ? " btn-accent" : ""}${rec ? " btn-rec" : ""}`}
      data-active={active ? "true" : "false"}
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  );
}

export function TopBar({
  libraryOpen,
  onToggleLibrary,
  lyricsOpen,
  onToggleLyrics,
}: {
  libraryOpen: boolean;
  onToggleLibrary: () => void;
  lyricsOpen: boolean;
  onToggleLyrics: () => void;
}) {
  const sceneId = useStore((s) => s.sceneId);
  const seed = useStore((s) => s.seed);
  const setScene = useStore((s) => s.setScene);
  const generate = useStore((s) => s.generate);
  const reseed = useStore((s) => s.reseed);
  const sceneLock = useStore((s) => s.sceneLock);
  const toggleSceneLock = useStore((s) => s.toggleSceneLock);
  const frozen = useStore((s) => s.frozen);
  const toggleFreeze = useStore((s) => s.toggleFreeze);
  const audioSource = useStore((s) => s.audioSource);
  const setAudioSource = useStore((s) => s.setAudioSource);
  const cameraOn = useStore((s) => s.cameraOn);
  const setCameraOn = useStore((s) => s.setCameraOn);
  const handsOn = useStore((s) => s.handsOn);
  const setHandsOn = useStore((s) => s.setHandsOn);
  const recording = useStore((s) => s.recording);
  const setPerformanceMode = useStore((s) => s.setPerformanceMode);
  const togglePanel = useStore((s) => s.togglePanel);
  const panelVisible = useStore((s) => s.panelVisible);

  const { loadFile } = useAudio();
  const { snapshot, toggleRecording } = useRecorder();
  const audioInput = useRef<HTMLInputElement>(null);
  const presetInput = useRef<HTMLInputElement>(null);

  return (
    <motion.div
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-col gap-2 p-3"
    >
      <div className="panel pointer-events-auto flex flex-wrap items-center gap-1 px-2.5 py-1.5">
        <span className="mr-2 select-none pl-1 text-[13px] font-semibold tracking-[0.28em] text-[var(--text)]">
          VISUALSET
        </span>

        <Btn accent onClick={generate} title="Generate (Space)">
          Generate
        </Btn>
        <Btn active={sceneLock} onClick={toggleSceneLock} title="Keep scene when generating">
          Lock
        </Btn>

        <button
          className="mono ml-1 flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-[var(--text-dim)] hover:text-[var(--text)]"
          onClick={() => reseed(Math.random().toString(36).slice(2, 10))}
          title="New seed"
        >
          <span className="label" style={{ letterSpacing: "0.12em" }}>seed</span>
          <span className="text-[var(--text)]">{seed}</span>
        </button>

        <span className="divider" />

        <Btn onClick={toggleFreeze} active={frozen} title="Freeze (F)">
          {frozen ? "Resume" : "Freeze"}
        </Btn>
        <Btn onClick={() => snapshot("png")} title="Save PNG (S)">
          PNG
        </Btn>
        <Btn rec active={recording} onClick={toggleRecording} title="Record (R)">
          {recording ? "Stop" : "Record"}
        </Btn>

        <span className="divider" />

        <Btn active={audioSource === "mic"} onClick={() => setAudioSource(audioSource === "mic" ? "none" : "mic")} title="Microphone (M)">
          Mic
        </Btn>
        <Btn onClick={() => audioInput.current?.click()} title="Load audio file">
          Audio
        </Btn>
        <Btn active={cameraOn} onClick={() => setCameraOn(!cameraOn)} title="Webcam (C)">
          Camera
        </Btn>
        <Btn active={handsOn} onClick={() => setHandsOn(!handsOn)} title="Hand tracking">
          Hands
        </Btn>
        <Btn active={lyricsOpen} onClick={onToggleLyrics} title="Lyrics engine">
          Lyrics
        </Btn>

        <span className="divider" />

        <Btn active={libraryOpen} onClick={onToggleLibrary} title="Preset library">
          Presets
        </Btn>
        <Btn onClick={() => savePreset()} title="Save current as preset">
          Save
        </Btn>
        <Btn onClick={() => exportPresetFile()} title="Export JSON">
          Export
        </Btn>
        <Btn onClick={() => presetInput.current?.click()} title="Import JSON">
          Import
        </Btn>

        <span className="divider" />

        <Btn active={panelVisible} onClick={togglePanel} title="Controls (H)">
          Controls
        </Btn>
        <Btn onClick={() => setPerformanceMode(true)} title="Performance (P)">
          Perform
        </Btn>
      </div>

      {/* scene selector */}
      <div className="panel pointer-events-auto flex flex-wrap items-center gap-0.5 px-2 py-1">
        {SCENES.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setScene(s.id)}
            className="rounded-md px-2.5 py-1 text-[11px] tracking-wide transition-colors"
            style={{
              color: sceneId === s.id ? "var(--text)" : "var(--text-faint)",
              background: sceneId === s.id ? "rgba(255,255,255,0.06)" : "transparent",
            }}
            title={`${s.name} (${i + 1})`}
          >
            {s.name}
          </button>
        ))}
      </div>

      <input ref={audioInput} type="file" accept="audio/*" className="hidden" onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])} />
      <input ref={presetInput} type="file" accept="application/json,.json" className="hidden" onChange={(e) => e.target.files?.[0] && importPresetFile(e.target.files[0])} />
    </motion.div>
  );
}
