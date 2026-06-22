import { create } from "zustand";
import type {
  AudioMapping,
  CameraMapping,
  Preset,
  SceneId,
  VisualParams,
  VisualState,
} from "@/lib/types";
import {
  defaultAudioMapping,
  defaultCameraMapping,
  generateParams,
  generateSeed,
  randomScene,
} from "@/generators/generate";
import {
  defaultCamFx,
  defaultCamfxOrder,
  defaultInteraction,
  type CamFx,
  type CamFxStage,
  type InteractionParams,
} from "@/lib/fx";

export type AudioSource = "none" | "mic" | "file";

interface UIState {
  panelVisible: boolean;
  performanceMode: boolean;
  sceneLock: boolean; // when true, Generate keeps the current scene
  frozen: boolean;
  audioSource: AudioSource;
  cameraOn: boolean;
  handsOn: boolean;
  recording: boolean;
  toast: string | null;
}

interface Store extends VisualState, UIState {
  interaction: InteractionParams;
  camfx: CamFx;
  camfxOrder: CamFxStage[];
  setInteraction: (p: Partial<InteractionParams>) => void;
  setCamFx: <S extends CamFxStage>(stage: S, patch: Partial<CamFx[S]>) => void;
  setCamfxOrder: (order: CamFxStage[]) => void;

  // ---- visual mutations ----
  setScene: (id: SceneId) => void;
  generate: () => void;
  reseed: (seed: string) => void;
  setParam: <K extends keyof VisualParams>(k: K, v: VisualParams[K]) => void;
  setParams: (p: Partial<VisualParams>) => void;
  setAudioMap: (p: Partial<AudioMapping>) => void;
  setCameraMap: (p: Partial<CameraMapping>) => void;
  loadState: (s: VisualState) => void;
  exportPreset: (name?: string) => Preset;

  // ---- ui mutations ----
  togglePanel: () => void;
  setPerformanceMode: (v: boolean) => void;
  toggleSceneLock: () => void;
  toggleFreeze: () => void;
  setAudioSource: (s: AudioSource) => void;
  setCameraOn: (v: boolean) => void;
  setHandsOn: (v: boolean) => void;
  setRecording: (v: boolean) => void;
  flash: (msg: string) => void;
}

const initialSeed = "visualset";
const initialScene: SceneId = "noisefield";

export const useStore = create<Store>((set, get) => ({
  // visual state
  sceneId: initialScene,
  seed: initialSeed,
  params: generateParams(initialSeed, initialScene),
  audio: defaultAudioMapping(),
  camera: defaultCameraMapping(),
  interaction: defaultInteraction(),
  camfx: defaultCamFx(),
  camfxOrder: defaultCamfxOrder(),

  // ui state
  panelVisible: true,
  performanceMode: false,
  sceneLock: false,
  frozen: false,
  audioSource: "none",
  cameraOn: false,
  handsOn: false,
  recording: false,
  toast: null,

  setScene: (id) =>
    set((s) => {
      const next: Partial<Store> = {
        sceneId: id,
        // keep the camfx mode when switching INTO camerafx, otherwise reroll params
        params: { ...generateParams(s.seed, id), camfxMode: s.params.camfxMode },
      };
      // Camera scenes need the webcam — enable it implicitly for convenience
      if ((id === "camerafx" || id === "rawcam") && !s.cameraOn) {
        next.cameraOn = true;
        next.camera = { ...s.camera, enabled: true };
      }
      return next;
    }),

  generate: () => {
    const s = get();
    const seed = generateSeed();
    const sceneId = s.sceneLock ? s.sceneId : randomScene(seed);
    set({ seed, sceneId, params: generateParams(seed, sceneId) });
    get().flash(`Seed ${seed} · ${sceneId}`);
  },

  reseed: (seed) => {
    const s = get();
    const sceneId = s.sceneId;
    set({ seed, params: generateParams(seed, sceneId) });
  },

  setParam: (k, v) => set((s) => ({ params: { ...s.params, [k]: v } })),
  setParams: (p) => set((s) => ({ params: { ...s.params, ...p } })),
  setAudioMap: (p) => set((s) => ({ audio: { ...s.audio, ...p } })),
  setCameraMap: (p) => set((s) => ({ camera: { ...s.camera, ...p } })),
  setInteraction: (p) => set((s) => ({ interaction: { ...s.interaction, ...p } })),
  setCamFx: (stage, patch) =>
    set((s) => ({ camfx: { ...s.camfx, [stage]: { ...s.camfx[stage], ...patch } } })),
  setCamfxOrder: (order) => set({ camfxOrder: order }),

  loadState: (st) =>
    set({
      sceneId: st.sceneId,
      seed: st.seed,
      params: st.params,
      audio: st.audio,
      camera: st.camera,
    }),

  exportPreset: (name) => {
    const s = get();
    return {
      name: name ?? `${s.params.paletteName} ${s.seed}`,
      createdAt: Date.now(),
      version: 1,
      sceneId: s.sceneId,
      seed: s.seed,
      params: s.params,
      audio: s.audio,
      camera: s.camera,
    };
  },

  togglePanel: () => set((s) => ({ panelVisible: !s.panelVisible })),
  setPerformanceMode: (v) =>
    set({ performanceMode: v, panelVisible: v ? false : true }),
  toggleSceneLock: () => set((s) => ({ sceneLock: !s.sceneLock })),
  toggleFreeze: () => set((s) => ({ frozen: !s.frozen })),
  setAudioSource: (src) => set({ audioSource: src }),
  setCameraOn: (v) =>
    set((s) => ({
      cameraOn: v,
      camera: { ...s.camera, enabled: v },
      // turning the camera off also stops hand tracking
      handsOn: v ? s.handsOn : false,
    })),
  setHandsOn: (v) =>
    set((s) => ({
      handsOn: v,
      // hands need the camera; enable it implicitly
      cameraOn: v ? true : s.cameraOn,
      camera: { ...s.camera, enabled: v ? true : s.camera.enabled },
    })),
  setRecording: (v) => set({ recording: v }),
  flash: (msg) => {
    set({ toast: msg });
    setTimeout(() => {
      if (get().toast === msg) set({ toast: null });
    }, 2200);
  },
}));
