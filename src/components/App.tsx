"use client";
import { useEffect, useRef, useState } from "react";
import { Leva } from "leva";
import { VisualCanvas } from "./VisualCanvas";
import { TopBar } from "./ui/TopBar";
import { Toast } from "./ui/Toast";
import { Meters } from "./ui/Meters";
import { ControlPanel } from "./ui/ControlPanel";
import { HelpOverlay } from "./ui/HelpOverlay";
import { PresetLibrary } from "./ui/PresetLibrary";
import { CameraFXChain } from "./ui/CameraFXChain";
import { useStore } from "@/store/useStore";
import { useAudio } from "@/audio/useAudio";
import { useWebcam } from "@/camera/useWebcam";
import { useHands } from "@/camera/useHands";
import { useSegmentation } from "@/camera/useSegmentation";
import { usePointer } from "@/hooks/usePointer";
import { useRecorder } from "@/hooks/useRecorder";
import { SCENES } from "@/lib/types";

// Neutral Leva theme so the control panel reads as part of the same pro UI.
const levaTheme = {
  colors: {
    elevation1: "rgba(14,16,19,0.6)",
    elevation2: "rgba(20,22,26,0.7)",
    elevation3: "rgba(28,30,35,0.9)",
    accent1: "rgb(122,230,200)",
    accent2: "rgb(122,230,200)",
    accent3: "rgb(122,230,200)",
    highlight1: "rgba(231,233,236,0.4)",
    highlight2: "rgba(231,233,236,0.75)",
    highlight3: "rgb(231,233,236)",
    vivid1: "rgb(122,230,200)",
  },
  radii: { xs: "4px", sm: "6px", lg: "10px" },
  fontSizes: { root: "11px" },
  sizes: { rootWidth: "300px", controlWidth: "150px" },
};

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [help, setHelp] = useState(false);
  const [library, setLibrary] = useState(false);

  // subsystems
  useAudio();
  useWebcam();
  useHands();
  useSegmentation();
  usePointer();
  const { snapshot, toggleRecording } = useRecorder();

  const seed = useStore((s) => s.seed);
  const sceneId = useStore((s) => s.sceneId);
  const colors = useStore((s) => s.params.colors);
  const panelVisible = useStore((s) => s.panelVisible);
  const performanceMode = useStore((s) => s.performanceMode);

  // derive the UI accent from the active palette (a mid-bright stop)
  useEffect(() => {
    const c = colors[3] ?? colors[colors.length - 1];
    if (!c) return;
    const rgb = c.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255)).join(" ");
    document.documentElement.style.setProperty("--accent", rgb);
  }, [colors]);

  // request/exit native fullscreen with performance mode
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
          else if (library) setLibrary(false);
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
  }, [snapshot, toggleRecording, library]);

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden bg-[var(--bg)] ${
        performanceMode ? "no-cursor" : ""
      }`}
      onDoubleClick={() => useStore.getState().setPerformanceMode(!performanceMode)}
    >
      <VisualCanvas />

      {/* Control panel (Leva fills this positioned container so it never collides
          with the top bar). The binding component registers the controls. */}
      {!performanceMode && (
        <div
          className="pointer-events-auto absolute right-3 top-[100px] z-30 w-[296px]"
          style={{ display: panelVisible ? "block" : "none" }}
        >
          <ControlPanel key={`${seed}:${sceneId}`} />
          <Leva
            fill
            flat
            theme={levaTheme}
            titleBar={{ title: "Controls", drag: false, filter: false }}
          />
        </div>
      )}

      {!performanceMode && (
        <>
          <TopBar libraryOpen={library} onToggleLibrary={() => setLibrary((v) => !v)} />
          <Meters />
          {sceneId === "camerafx" && panelVisible && <CameraFXChain />}
          <PresetLibrary open={library} onClose={() => setLibrary(false)} />
          <button
            className="btn pointer-events-auto absolute right-3 top-3 z-40 h-7 w-7 justify-center border border-[var(--hair)] !px-0"
            onClick={() => setHelp(true)}
            title="Help (?)"
          >
            ?
          </button>
        </>
      )}

      {performanceMode && (
        <div className="pointer-events-none absolute bottom-5 left-1/2 z-30 -translate-x-1/2 text-[10px] uppercase tracking-[0.3em] text-[var(--text-faint)]">
          performance — esc to exit
        </div>
      )}

      <Toast />
      <HelpOverlay open={help} onClose={() => setHelp(false)} />
    </div>
  );
}
