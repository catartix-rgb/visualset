"use client";
import { useRef } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/store/useStore";
import { SCENES } from "@/lib/types";
import { useAudio } from "@/audio/useAudio";
import { useRecorder } from "@/hooks/useRecorder";
import {
  exportPresetFile,
  importPresetFile,
  savePreset,
} from "@/presets/presets";

export function TopBar() {
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
  const recording = useStore((s) => s.recording);
  const setPerformanceMode = useStore((s) => s.setPerformanceMode);
  const togglePanel = useStore((s) => s.togglePanel);

  const { loadFile } = useAudio();
  const { snapshot, toggleRecording } = useRecorder();
  const audioInput = useRef<HTMLInputElement>(null);
  const presetInput = useRef<HTMLInputElement>(null);

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-col gap-2 p-3"
    >
      {/* Row 1 — brand, generate, transport */}
      <div className="glass pointer-events-auto flex flex-wrap items-center gap-2 rounded-2xl px-3 py-2">
        <span className="mr-1 select-none text-sm font-bold tracking-[0.3em] text-accent">
          VISUAL<span className="text-accent2">SET</span>
        </span>

        <button className="btn btn-primary" onClick={generate} title="Generate (Space)">
          ✦ Generate
        </button>

        <button
          className="btn"
          onClick={toggleSceneLock}
          title="Lock scene during Generate"
          style={sceneLock ? { borderColor: "rgba(94,234,212,0.6)", color: "#fff" } : undefined}
        >
          {sceneLock ? "🔒 Scene" : "🔓 Scene"}
        </button>

        <div className="mx-1 flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-xs text-white/70">
          <span className="opacity-60">seed</span>
          <button
            className="font-mono text-accent hover:text-white"
            title="New random seed"
            onClick={() => reseed(Math.random().toString(36).slice(2, 10))}
          >
            {seed}
          </button>
        </div>

        <span className="mx-1 h-5 w-px bg-white/10" />

        <button className="btn" onClick={toggleFreeze} title="Freeze (F)">
          {frozen ? "▶ Resume" : "❚❚ Freeze"}
        </button>
        <button className="btn" onClick={() => snapshot("png")} title="Snapshot PNG (S)">
          ⤓ PNG
        </button>
        <button
          className="btn"
          onClick={toggleRecording}
          title="Record video (R)"
          style={recording ? { borderColor: "#ff5d5d", color: "#ff8b8b" } : undefined}
        >
          {recording ? "■ Stop" : "● Rec"}
        </button>

        <span className="mx-1 h-5 w-px bg-white/10" />

        {/* sources */}
        <button
          className="btn"
          onClick={() => setAudioSource(audioSource === "mic" ? "none" : "mic")}
          style={audioSource === "mic" ? { borderColor: "rgba(94,234,212,0.6)", color: "#fff" } : undefined}
          title="Microphone (M)"
        >
          🎤 Mic
        </button>
        <button className="btn" onClick={() => audioInput.current?.click()} title="Load audio file">
          ♫ File
        </button>
        <button
          className="btn"
          onClick={() => setCameraOn(!cameraOn)}
          style={cameraOn ? { borderColor: "rgba(167,139,250,0.7)", color: "#fff" } : undefined}
          title="Webcam (C)"
        >
          ◉ Cam
        </button>

        <span className="mx-1 h-5 w-px bg-white/10" />

        {/* presets */}
        <button className="btn" onClick={() => savePreset()} title="Save preset to browser">
          ＋ Save
        </button>
        <button className="btn" onClick={() => exportPresetFile()} title="Export preset JSON">
          ⇪ Export
        </button>
        <button className="btn" onClick={() => presetInput.current?.click()} title="Import preset JSON">
          ⇩ Import
        </button>

        <span className="mx-1 h-5 w-px bg-white/10" />

        <button className="btn" onClick={togglePanel} title="Toggle panel (H)">
          ⚙ Panel
        </button>
        <button className="btn" onClick={() => setPerformanceMode(true)} title="Performance / fullscreen (P)">
          ⤢ Perform
        </button>
      </div>

      {/* Row 2 — scene tabs */}
      <div className="glass pointer-events-auto flex flex-wrap items-center gap-1 rounded-2xl px-2 py-1.5">
        {SCENES.map((s) => (
          <button
            key={s.id}
            onClick={() => setScene(s.id)}
            className="rounded-lg px-3 py-1 text-[11px] uppercase tracking-wider transition-all"
            style={{
              background: sceneId === s.id ? "linear-gradient(120deg,rgba(94,234,212,0.25),rgba(167,139,250,0.25))" : "transparent",
              color: sceneId === s.id ? "#fff" : "rgba(220,228,240,0.6)",
              border: sceneId === s.id ? "1px solid rgba(94,234,212,0.5)" : "1px solid transparent",
            }}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* hidden inputs */}
      <input
        ref={audioInput}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])}
      />
      <input
        ref={presetInput}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && importPresetFile(e.target.files[0])}
      />
    </motion.div>
  );
}
