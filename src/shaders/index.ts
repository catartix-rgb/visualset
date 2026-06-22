import { buildFragment } from "./common";
import { FULLSCREEN_VERT } from "./vertex";
import { NOISEFIELD_MAIN } from "./scenes/noisefield";
import { NEBULA_MAIN } from "./scenes/nebula";
import { RAYMARCH_MAIN } from "./scenes/raymarch";
import { KALEIDO_MAIN } from "./scenes/kaleido";
import { LIQUID_MAIN } from "./scenes/liquid";
import { GEOMETRIC_MAIN } from "./scenes/geometric";
import { FEEDBACK_MAIN } from "./scenes/feedback";
import { CAMERAFX_MAIN } from "./scenes/camerafx";
import type { SceneId } from "@/lib/types";

/** Fragment shaders for the fullscreen scenes (particles renders its own geometry). */
export const FRAGMENTS: Record<Exclude<SceneId, "particles">, string> = {
  noisefield: buildFragment(NOISEFIELD_MAIN),
  nebula: buildFragment(NEBULA_MAIN),
  raymarch: buildFragment(RAYMARCH_MAIN),
  kaleido: buildFragment(KALEIDO_MAIN),
  liquid: buildFragment(LIQUID_MAIN),
  geometric: buildFragment(GEOMETRIC_MAIN),
  feedback: buildFragment(FEEDBACK_MAIN),
  camerafx: buildFragment(CAMERAFX_MAIN),
};

export { FULLSCREEN_VERT };
