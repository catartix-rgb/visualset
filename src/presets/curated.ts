import type { SceneId, VisualParams, VisualState } from "@/lib/types";
import { paletteByName } from "@/lib/palettes";
import {
  defaultAudioMapping,
  defaultCameraMapping,
  generateParams,
} from "@/generators/generate";

export interface CuratedPreset {
  name: string;
  blurb: string;
  state: VisualState;
}

interface Spec {
  name: string;
  blurb: string;
  scene: SceneId;
  palette: string;
  seed: string;
  params?: Partial<VisualParams>;
  audio?: Partial<ReturnType<typeof defaultAudioMapping>>;
  camera?: Partial<ReturnType<typeof defaultCameraMapping>>;
}

function build(s: Spec): CuratedPreset {
  const pal = paletteByName(s.palette);
  const base = generateParams(s.seed, s.scene);
  const params: VisualParams = {
    ...base,
    paletteName: pal.name,
    colors: pal.colors,
    bg: pal.colors[0],
    ...s.params,
  };
  return {
    name: s.name,
    blurb: s.blurb,
    state: {
      sceneId: s.scene,
      seed: s.seed,
      params,
      audio: { ...defaultAudioMapping(), ...s.audio },
      camera: { ...defaultCameraMapping(), ...s.camera },
    },
  };
}

// 15 hand-tuned starting points. Each sets shader/scene, palette, physics, audio
// response and camera/hand response — and is meant to look good instantly while
// remaining fully editable.
export const CURATED: CuratedPreset[] = [
  build({
    name: "Liquid Cosmos",
    blurb: "Slow chrome metaballs drifting through deep space.",
    scene: "liquid",
    palette: "Glacier",
    seed: "liquidcosmos",
    params: { speed: 0.45, scale: 1.1, glow: 0.9, distortion: 0.5, contrast: 1.2, saturation: 1.1, vignette: 0.6, grain: 0.05 },
    audio: { reactivity: 1.0, toGlow: 1.2, toScale: 0.5 },
  }),
  build({
    name: "Neural Bloom",
    blurb: "Particles blossoming between organic structures.",
    scene: "particles",
    palette: "Ultraviolet",
    seed: "neuralbloom",
    params: { speed: 0.8, glow: 1.0, flow: 1.4, scale: 1.0, saturation: 1.2 },
    audio: { reactivity: 1.2, toGlow: 1.3, toSpeed: 0.6 },
  }),
  build({
    name: "Digital Organism",
    blurb: "A breathing, mutating lifeform of light.",
    scene: "particles",
    palette: "Verdant",
    seed: "digitalorganism",
    params: { speed: 0.6, flow: 1.2, glow: 0.85, distortion: 0.7, saturation: 1.15 },
    audio: { reactivity: 1.1, toDistortion: 1.0 },
  }),
  build({
    name: "Audio Storm",
    blurb: "Turbulent feedback that erupts with the music.",
    scene: "feedback",
    palette: "Magma",
    seed: "audiostorm",
    params: { speed: 1.0, trail: 0.94, distortion: 0.8, glow: 1.0, flow: 1.5, grain: 0.06 },
    audio: { reactivity: 1.8, bassGain: 1.4, toDistortion: 1.4, toGlow: 1.5, toSpeed: 0.8 },
  }),
  build({
    name: "Gravity Field",
    blurb: "Mass collapsing and scattering in monochrome.",
    scene: "particles",
    palette: "Mono Ice",
    seed: "gravityfield",
    params: { speed: 0.5, flow: 1.6, glow: 0.7, scale: 1.1, contrast: 1.3, saturation: 0.8 },
    audio: { reactivity: 1.0, bassGain: 1.5, toScale: 0.8 },
  }),
  build({
    name: "Particle Galaxy",
    blurb: "Spiral arms of light, slowly rotating.",
    scene: "particles",
    palette: "Neon Tokyo",
    seed: "particlegalaxy",
    params: { speed: 0.55, flow: 1.0, glow: 1.1, scale: 1.0, saturation: 1.25, vignette: 0.7 },
    audio: { reactivity: 0.9, toGlow: 1.1 },
  }),
  build({
    name: "Fractal Swarm",
    blurb: "Dense swarming detail that never settles.",
    scene: "noisefield",
    palette: "Plasma",
    seed: "fractalswarm",
    params: { speed: 0.9, scale: 2.2, complexity: 6, distortion: 0.9, glow: 0.9 },
    audio: { reactivity: 1.3, toDistortion: 1.1, toSpeed: 0.7 },
  }),
  build({
    name: "Glitch Cathedral",
    blurb: "Sacred symmetry shattered by digital noise.",
    scene: "feedback",
    palette: "Ultraviolet",
    seed: "glitchcathedral",
    params: { speed: 0.8, trail: 0.96, distortion: 0.5, glow: 0.9, grain: 0.1, vignette: 0.7 },
    audio: { reactivity: 1.5, trebleGain: 1.6, toDistortion: 1.2, toGlow: 1.3 },
  }),
  build({
    name: "Dream Flow",
    blurb: "Soft pastel currents, weightless and calm.",
    scene: "noisefield",
    palette: "Glacier",
    seed: "dreamflow",
    params: { speed: 0.35, scale: 1.2, complexity: 4, distortion: 0.4, glow: 0.8, saturation: 1.0, vignette: 0.5, grain: 0.03 },
    audio: { reactivity: 0.7, toSpeed: 0.3 },
  }),
  build({
    name: "Quantum Noise",
    blurb: "Cold probabilistic fields shimmering in and out.",
    scene: "nebula",
    palette: "Cyanic",
    seed: "quantumnoise",
    params: { speed: 0.5, scale: 0.8, complexity: 5, glow: 1.0, contrast: 1.2 },
    audio: { reactivity: 1.0, trebleGain: 1.3, toGlow: 1.2 },
  }),
  build({
    name: "Organic Pulse",
    blurb: "Warm living tissue pulsing with the beat.",
    scene: "liquid",
    palette: "Coral Reef",
    seed: "organicpulse",
    params: { speed: 0.6, glow: 0.95, distortion: 0.6, saturation: 1.25, contrast: 1.15 },
    audio: { reactivity: 1.3, bassGain: 1.3, toScale: 0.7, toGlow: 1.1 },
  }),
  build({
    name: "Refik Style",
    blurb: "Vast data clouds flowing like machine memory.",
    scene: "nebula",
    palette: "Mono Ice",
    seed: "refikstyle",
    params: { speed: 0.4, scale: 0.7, complexity: 6, glow: 0.9, distortion: 0.6, saturation: 0.95, contrast: 1.25, vignette: 0.55, grain: 0.04 },
    audio: { reactivity: 0.9, toGlow: 1.0, toDistortion: 0.8 },
  }),
  build({
    name: "Max Cooper Inspired",
    blurb: "Precise volumetric geometry in motion.",
    scene: "raymarch",
    palette: "Ultraviolet",
    seed: "maxcooper",
    params: { speed: 0.6, scale: 1.1, distortion: 0.5, glow: 1.0, contrast: 1.3, vignette: 0.7 },
    audio: { reactivity: 1.1, bassGain: 1.2, toScale: 0.6, toGlow: 1.2 },
  }),
  build({
    name: "Techno Visualizer",
    blurb: "Hard-edged geometry slamming on every beat.",
    scene: "geometric",
    palette: "Solaris",
    seed: "technovisualizer",
    params: { speed: 0.8, symmetry: 6, glow: 1.1, distortion: 0.4, contrast: 1.35, saturation: 1.2 },
    audio: { reactivity: 1.6, bassGain: 1.5, toGlow: 1.4, toScale: 0.7, toSpeed: 0.6 },
  }),
  build({
    name: "Ambient Reactor",
    blurb: "Gentle aurora that responds to the quietest sounds.",
    scene: "nebula",
    palette: "Aurora",
    seed: "ambientreactor",
    params: { speed: 0.35, scale: 0.7, complexity: 5, glow: 0.95, saturation: 1.1, vignette: 0.5, grain: 0.03 },
    audio: { reactivity: 0.8, toGlow: 1.1, toSpeed: 0.3 },
  }),
];
