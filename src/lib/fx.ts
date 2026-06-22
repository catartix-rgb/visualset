// Data model for the fluid interaction system and the modular Camera FX stack.

/** Global controls for the GPU fluid interaction field (TouchField). */
export interface InteractionParams {
  force: number; // how hard pointer/finger pushes into the field
  radius: number; // deposit radius
  persistence: number; // 0.9..0.998 — how long deformations linger before recovering
  turbulence: number; // curl injected on fast motion -> swirls
  fluidity: number; // semi-Lagrangian advection strength -> flowing transport
  elasticity: number; // how strongly scenes are displaced by the field
}

export function defaultInteraction(): InteractionParams {
  return {
    force: 1.4,
    radius: 0.09,
    persistence: 0.984,
    turbulence: 1.0,
    fluidity: 1.0,
    elasticity: 1.2,
  };
}

// ---- Modular Camera FX -------------------------------------------------------
// Each stage is independent and stackable; the shader applies them in order.
// `audio` routes bass/treble/beat into that stage's key parameter.

export interface CamFx {
  // Optional global distortion stage — OFF by default so the camera is independent
  // and clean. When on, the fluid interaction field + audio physically warp the image.
  distort: { on: boolean; touch: number; bass: number; jitter: number };
  halftone: { on: boolean; size: number; angle: number; shape: number; audio: number };
  dotmatrix: { on: boolean; density: number; glow: number; audio: number };
  dither: { on: boolean; algo: number; scale: number; threshold: number; contrast: number; noise: number; audio: number };
  edge: { on: boolean; strength: number; thickness: number; glow: number; invert: boolean; audio: number };
  posterize: { on: boolean; levels: number; audio: number };
  threshold: { on: boolean; value: number; soft: number; invert: boolean; audio: number };
  mono: { on: boolean; tint: number; gamma: number };
  pixelsort: { on: boolean; amount: number; threshold: number; direction: number; speed: number };
  chroma: { on: boolean; amount: number; audio: number };
  scan: { on: boolean; intensity: number; spacing: number; thickness: number };
  crt: { on: boolean; curvature: number; glow: number };
  bloom: { on: boolean; amount: number; audio: number };
  grain: { on: boolean; amount: number };
}

export type CamFxStage = keyof CamFx;

export const DITHER_ALGOS = ["Bayer", "Ordered", "Atkinson", "Random"] as const;
export const HALFTONE_SHAPES = ["Circle", "Square", "Line"] as const;
export const SORT_DIRECTIONS = ["Up", "Down", "Left", "Right"] as const;

export function defaultCamFx(): CamFx {
  return {
    distort: { on: false, touch: 1, bass: 1, jitter: 1 },
    halftone: { on: true, size: 0.55, angle: 0.4, shape: 0, audio: 0.6 },
    dotmatrix: { on: false, density: 90, glow: 0.6, audio: 0.5 },
    dither: { on: false, algo: 0, scale: 1, threshold: 0.5, contrast: 1, noise: 0.1, audio: 0.4 },
    edge: { on: false, strength: 4, thickness: 1, glow: 1, invert: false, audio: 0.5 },
    posterize: { on: false, levels: 5, audio: 0.4 },
    threshold: { on: false, value: 0.5, soft: 0.08, invert: false, audio: 0.6 },
    mono: { on: false, tint: 0.5, gamma: 1 },
    pixelsort: { on: false, amount: 0.4, threshold: 0.6, direction: 0, speed: 0 },
    chroma: { on: false, amount: 0.3, audio: 0.7 },
    scan: { on: false, intensity: 0.4, spacing: 700, thickness: 0.5 },
    crt: { on: false, curvature: 0.3, glow: 0.5 },
    bloom: { on: false, amount: 0.5, audio: 0.8 },
    grain: { on: false, amount: 0.08 },
  };
}
