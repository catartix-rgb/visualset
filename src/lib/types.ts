import type { RGB } from "./palettes";

export type SceneId =
  | "noisefield"
  | "nebula"
  | "raymarch"
  | "kaleido"
  | "liquid"
  | "geometric"
  | "feedback"
  | "particles";

/** Generic visual parameters. Every scene reads the subset it needs as uniforms. */
export interface VisualParams {
  paletteName: string;
  colors: RGB[]; // 5 stops
  bg: RGB;

  speed: number; // global animation rate
  scale: number; // spatial frequency / zoom
  complexity: number; // octaves / iteration count
  distortion: number; // domain warp amount
  glow: number; // bloom-ish brightness lift
  contrast: number;
  saturation: number;
  hueShift: number; // radians
  symmetry: number; // kaleidoscope segments / mirror count
  grain: number; // film grain amount
  vignette: number;
  flow: number; // flow-field strength (particles / fields)
  trail: number; // feedback persistence 0..1
}

/** How strongly each audio band drives motion/visuals. */
export interface AudioMapping {
  reactivity: number; // master audio gain into visuals
  bassGain: number;
  midGain: number;
  trebleGain: number;
  toScale: number;
  toDistortion: number;
  toGlow: number;
  toSpeed: number;
}

/** How the webcam drives the visuals. */
export interface CameraMapping {
  enabled: boolean;
  motionToForce: number;
  motionToDistortion: number;
  feedToColor: number; // blend camera image into the look
  mirror: boolean;
}

export interface VisualState {
  sceneId: SceneId;
  seed: string;
  params: VisualParams;
  audio: AudioMapping;
  camera: CameraMapping;
}

export interface Preset extends VisualState {
  name: string;
  createdAt: number;
  version: 1;
}

export interface SceneMeta {
  id: SceneId;
  name: string;
  tags: string[];
}

export const SCENES: SceneMeta[] = [
  { id: "noisefield", name: "Noise Field", tags: ["fields", "flow", "organic"] },
  { id: "nebula", name: "Nebula", tags: ["fbm", "clouds", "deep"] },
  { id: "raymarch", name: "Raymarch", tags: ["3d", "volumetric"] },
  { id: "kaleido", name: "Kaleidoscope", tags: ["symmetry", "mirror"] },
  { id: "liquid", name: "Liquid Metal", tags: ["metaball", "organic", "distortion"] },
  { id: "geometric", name: "Geometric", tags: ["shapes", "reactive"] },
  { id: "feedback", name: "Feedback / Trails", tags: ["glitch", "feedback", "trails"] },
  { id: "particles", name: "Particle Flow", tags: ["particles", "flowfield", "fluid"] },
];
