"use client";
import { useEffect, useRef, useState } from "react";
import { Leva } from "leva";
import { VisualCanvas } from "./VisualCanvas";
import { TopBar } from "./ui/TopBar";
import { Toast } from "./ui/Toast";
import { Meters } from "./ui/Meters";
import { ControlPanel } from "./ui/ControlPanel";
import { HelpOverlay } from "./ui/HelpOverlay";
import { PresetShelf } from "./ui/PresetShelf";
import { useStore } from "@/store/useStore";
import { useAudio } from "@/audio/useAudio";
import { useWebcam } from "@/camera/useWebcam";
import { usePointer } from "@/hooks/usePointer";
import { useRecorder } from "@/hooks/useRecorder";
import { SCENES } from "@/lib/types";

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [help, setHelp] = useState(false);

  // subsystems
  useAudio();
  useWebcam();
  usePointer();
  const { snapshot, toggleRecording } = useRecorder();

  const seed = useStore((s) => s.seed);
  const sceneId = useStore((s) => s.sceneId);
  const panelVisible = useStore((s) => s.panelVisible);
  const performanceMode = useStore((s) => s.performanceMode);

  // request/exit native fullscreen alongside performance mode
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (performanceMode && !document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => void 0);
    } else if (!performanceMode && document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => void 0);
    }
  }, [performanceMode]);

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // ignore when typing in inputs (Leva, file dialogs, etc.)
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const s = useStore.getState();

      switch (e.key) {
        case " ":
          e.preventDefault();
          s.generate();
          break;
        case "f":
        case "F":
          s.toggleFreeze();
          break;
        case "h":
        case "H":
          s.togglePanel();
          break;
        case "p":
        case "P":
          s.setPerformanceMode(!s.performanceMode);
          break;
        case "Escape":
          if (s.performanceMode) s.setPerformanceMode(false);
          break;
        case "r":
        case "R":
          toggleRecording();
          break;
        case "s":
        case "S":
          snapshot("png");
          break;
        case "m":
        case "M":
          s.setAudioSource(s.audioSource === "mic" ? "none" : "mic");
          break;
        case "c":
        case "C":
          s.setCameraOn(!s.cameraOn);
          break;
        case "?":
          setHelp((v) => !v);
          break;
        default:
          if (e.key >= "1" && e.key <= "8") {
            const idx = parseInt(e.key, 10) - 1;
            if (SCENES[idx]) s.setScene(SCENES[idx].id);
          }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [snapshot, toggleRecording]);

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden bg-ink ${
        performanceMode ? "no-cursor" : ""
      }`}
      onDoubleClick={() => useStore.getState().setPerformanceMode(!performanceMode)}
    >
      <VisualCanvas />

      {/* Leva panel chrome (binding component drives it) */}
      <div style={{ display: panelVisible && !performanceMode ? "block" : "none" }}>
        <ControlPanel key={`${seed}:${sceneId}`} />
      </div>
      <Leva hidden={!panelVisible || performanceMode} collapsed={false} titleBar={{ title: "VISUALSET" }} />

      {!performanceMode && (
        <>
          <TopBar />
          <Meters />
          <PresetShelf />
          <button
            className="btn pointer-events-auto absolute right-3 top-3 z-40"
            style={{ display: "none" }}
            onClick={() => setHelp(true)}
          >
            ?
          </button>
        </>
      )}

      {performanceMode && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-30 -translate-x-1/2 text-[10px] uppercase tracking-[0.3em] text-white/30">
          performance mode · Esc to exit
        </div>
      )}

      <Toast />
      <HelpOverlay open={help} onClose={() => setHelp(false)} />
    </div>
  );
}
