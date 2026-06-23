import { buildFragment } from "./common";
import { FULLSCREEN_VERT } from "./vertex";
import { NOISEFIELD_MAIN } from "./scenes/noisefield";
import { NEBULA_MAIN } from "./scenes/nebula";
import { RAYMARCH_MAIN } from "./scenes/raymarch";
import { KALEIDO_MAIN } from "./scenes/kaleido";
import { LIQUID_MAIN } from "./scenes/liquid";
import { GEOMETRIC_MAIN } from "./scenes/geometric";
import { FEEDBACK_MAIN } from "./scenes/feedback";
import { RAWCAM_MAIN } from "./scenes/rawcam";
import { CLAY_MAIN } from "./scenes/clay";
import type { SceneId } from "@/lib/types";

/** Fragment shaders for the fullscreen scenes. `particles` renders geometry and
 *  `camerafx` is a multi-pass chain — both have dedicated components. */
export const FRAGMENTS: Record<Exclude<SceneId, "particles" | "camerafx">, string> = {
  noisefield: buildFragment(NOISEFIELD_MAIN),
  nebula: buildFragment(NEBULA_MAIN),
  raymarch: buildFragment(RAYMARCH_MAIN),
  kaleido: buildFragment(KALEIDO_MAIN),
  liquid: buildFragment(LIQUID_MAIN),
  geometric: buildFragment(GEOMETRIC_MAIN),
  feedback: buildFragment(FEEDBACK_MAIN),
  clay: buildFragment(CLAY_MAIN),
  rawcam: buildFragment(RAWCAM_MAIN),
};

export { FULLSCREEN_VERT };
