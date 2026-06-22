import { Rng, generateSeed } from "@/lib/random";
import { PALETTES } from "@/lib/palettes";
import type {
  AudioMapping,
  CameraMapping,
  SceneId,
  VisualParams,
} from "@/lib/types";
import { SCENES } from "@/lib/types";

// Per-scene "taste" overrides so each module lands in its sweet spot rather than
// using one flat random range that looks good on some scenes and ugly on others.
const SCENE_BIAS: Partial<Record<SceneId, Partial<VisualParams>>> = {
  raymarch: { complexity: 3, scale: 1.2 },
  particles: { flow: 1.4, trail: 0.92 },
  feedback: { trail: 0.96, distortion: 0.6 },
  kaleido: { symmetry: 6 },
  nebula: { scale: 0.7, complexity: 5 },
};

export function generateParams(seed: string, sceneId: SceneId): VisualParams {
  const rng = new Rng(seed + ":" + sceneId);
  const palette = rng.pick(PALETTES);
  const colors = palette.colors;
  const bias = SCENE_BIAS[sceneId] ?? {};

  const params: VisualParams = {
    paletteName: palette.name,
    colors,
    bg: colors[0],
    speed: rng.curve(0.25, 1.4, 2),
    scale: bias.scale ?? rng.curve(0.6, 2.6, 2),
    complexity: bias.complexity ?? rng.int(3, 6),
    distortion: bias.distortion ?? rng.curve(0.1, 1.0, 2),
    glow: rng.curve(0.35, 1.1, 2),
    contrast: rng.curve(0.9, 1.5, 2),
    saturation: rng.curve(0.85, 1.35, 2),
    hueShift: rng.range(-0.4, 0.4),
    symmetry: bias.symmetry ?? rng.int(3, 10),
    grain: rng.curve(0.02, 0.12, 2),
    vignette: rng.curve(0.25, 0.7, 2),
    flow: bias.flow ?? rng.curve(0.4, 1.6, 2),
    trail: bias.trail ?? rng.curve(0.8, 0.97, 2),
    camfxMode: rng.int(0, 6),
  };
  return params;
}

export function defaultAudioMapping(): AudioMapping {
  return {
    reactivity: 1,
    bassGain: 1,
    midGain: 0.8,
    trebleGain: 0.9,
    toScale: 0.6,
    toDistortion: 0.8,
    toGlow: 1,
    toSpeed: 0.5,
  };
}

export function defaultCameraMapping(): CameraMapping {
  return {
    enabled: false,
    motionToForce: 1,
    motionToDistortion: 0.8,
    feedToColor: 0.6,
    mirror: true,
    sendToEngine: false,
  };
}

/** Pick a generative scene at random (Generate never jumps to a camera source). */
export function randomScene(seed: string): SceneId {
  const generative = SCENES.filter((s) => s.id !== "rawcam" && s.id !== "camerafx");
  return new Rng(seed + ":scene").pick(generative).id;
}

export { generateSeed };
