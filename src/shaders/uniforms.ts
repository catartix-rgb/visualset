import * as THREE from "three";
import type { AudioMapping, CameraMapping, VisualParams } from "@/lib/types";
import type { CamFx, InteractionParams } from "@/lib/fx";
import { signals } from "@/lib/signals";

export type Uniforms = Record<string, THREE.IUniform>;

const white = (): THREE.Vector3 => new THREE.Vector3(1, 1, 1);

// 1x1 black fallback so the uCam sampler is always bound to a real texture
// (avoids "no texture bound" warnings before the webcam starts).
const DEFAULT_TEX = new THREE.DataTexture(
  new Uint8Array([0, 0, 0, 255]),
  1,
  1,
  THREE.RGBAFormat
);
DEFAULT_TEX.needsUpdate = true;

export function buildUniforms(): Uniforms {
  return {
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },

    uBass: { value: 0 },
    uMid: { value: 0 },
    uTreble: { value: 0 },
    uRms: { value: 0 },
    uBeat: { value: 0 },

    uPointer: { value: new THREE.Vector2(0.5, 0.5) },
    uPointerDown: { value: 0 },
    uPointerVel: { value: new THREE.Vector2(0, 0) },

    uCam: { value: DEFAULT_TEX },
    uCamActive: { value: 0 },
    uCamMotion: { value: 0 },
    uCamBright: { value: 0 },
    uCamFeed: { value: 0 },
    uCamMirror: { value: 1 },

    uC0: { value: white() },
    uC1: { value: white() },
    uC2: { value: white() },
    uC3: { value: white() },
    uC4: { value: white() },
    uBg: { value: new THREE.Vector3(0, 0, 0) },

    uSpeed: { value: 1 },
    uScale: { value: 1 },
    uComplexity: { value: 4 },
    uDistort: { value: 0.5 },
    uGlow: { value: 0.7 },
    uContrast: { value: 1.1 },
    uSat: { value: 1.1 },
    uHue: { value: 0 },
    uSymmetry: { value: 6 },
    uGrain: { value: 0.05 },
    uVignette: { value: 0.5 },
    uFlow: { value: 1 },
    uTrail: { value: 0.92 },
    uCamFxMode: { value: 0 },

    uAToScale: { value: 0.6 },
    uAToDistort: { value: 0.8 },
    uAToGlow: { value: 1 },
    uAToSpeed: { value: 0.5 },

    uFeedback: { value: null },

    // ---- interaction field ----
    uTouch: { value: DEFAULT_TEX },
    uTouchActive: { value: 0 },
    uForce: { value: 1.2 }, // how strongly scenes are displaced by the field

    // ---- modular camera fx (set via applyCamFx) ----
    uDsOn: { value: 0 }, uDsTouch: { value: 1 }, uDsBass: { value: 1 }, uDsJitter: { value: 1 },
    uHtOn: { value: 1 }, uHtSize: { value: 0.55 }, uHtAngle: { value: 0.4 }, uHtShape: { value: 0 }, uHtAudio: { value: 0.6 },
    uDmOn: { value: 0 }, uDmDensity: { value: 90 }, uDmGlow: { value: 0.6 }, uDmAudio: { value: 0.5 },
    uDiOn: { value: 0 }, uDiAlgo: { value: 0 }, uDiScale: { value: 1 }, uDiThresh: { value: 0.5 }, uDiContrast: { value: 1 }, uDiNoise: { value: 0.1 }, uDiAudio: { value: 0.4 },
    uEdOn: { value: 0 }, uEdStrength: { value: 4 }, uEdThick: { value: 1 }, uEdGlow: { value: 1 }, uEdInvert: { value: 0 }, uEdAudio: { value: 0.5 },
    uPoOn: { value: 0 }, uPoLevels: { value: 5 }, uPoAudio: { value: 0.4 },
    uThOn: { value: 0 }, uThValue: { value: 0.5 }, uThSoft: { value: 0.08 }, uThInvert: { value: 0 }, uThAudio: { value: 0.6 },
    uMoOn: { value: 0 }, uMoTint: { value: 0.5 }, uMoGamma: { value: 1 },
    uPsOn: { value: 0 }, uPsAmount: { value: 0.4 }, uPsThresh: { value: 0.6 }, uPsDir: { value: 0 }, uPsSpeed: { value: 0 },
    uChOn: { value: 0 }, uChAmount: { value: 0.3 }, uChAudio: { value: 0.7 },
    uScOn: { value: 0 }, uScIntensity: { value: 0.4 }, uScSpacing: { value: 700 }, uScThick: { value: 0.5 },
    uCrtOn: { value: 0 }, uCrtCurve: { value: 0.3 }, uCrtGlow: { value: 0.5 },
    uBlOn: { value: 0 }, uBlAmount: { value: 0.5 }, uBlAudio: { value: 0.8 },
    uGrOn: { value: 0 }, uGrAmount: { value: 0.08 },

    // ---- particle morphing + field dynamics (written by ParticleScene) ----
    uMorph: { value: 0 },
    uShapeA: { value: 0 },
    uShapeB: { value: 1 },
    uFieldRotX: { value: 0 },
    uFieldRotY: { value: 0 },
    uFieldScale: { value: 1 },
    uVortex: { value: 0 },
    uExplosion: { value: 0 },

    // ---- hands ----
    uHand0: { value: new THREE.Vector4(0, 0, 0.5, 0) },
    uHand1: { value: new THREE.Vector4(0, 0, 0.5, 0) },
    uHandCount: { value: 0 },
    uHandEnergy: { value: 0 },
  };
}

function setColor(u: THREE.IUniform, c: [number, number, number] | undefined) {
  if (!c) return;
  (u.value as THREE.Vector3).set(c[0], c[1], c[2]);
}

/** Push static params (colors + look sliders + mapping amounts) into uniforms. */
export function applyParams(
  u: Uniforms,
  p: VisualParams,
  audio: AudioMapping,
  camera: CameraMapping
) {
  setColor(u.uC0, p.colors[0]);
  setColor(u.uC1, p.colors[1]);
  setColor(u.uC2, p.colors[2]);
  setColor(u.uC3, p.colors[3]);
  setColor(u.uC4, p.colors[4]);
  setColor(u.uBg, p.bg);

  u.uSpeed.value = p.speed;
  u.uScale.value = p.scale;
  u.uComplexity.value = p.complexity;
  u.uDistort.value = p.distortion;
  u.uGlow.value = p.glow;
  u.uContrast.value = p.contrast;
  u.uSat.value = p.saturation;
  u.uHue.value = p.hueShift;
  u.uSymmetry.value = p.symmetry;
  u.uGrain.value = p.grain;
  u.uVignette.value = p.vignette;
  u.uFlow.value = p.flow;
  u.uTrail.value = p.trail;
  u.uCamFxMode.value = p.camfxMode ?? 0;

  u.uAToScale.value = audio.toScale;
  u.uAToDistort.value = audio.toDistortion;
  u.uAToGlow.value = audio.toGlow;
  u.uAToSpeed.value = audio.toSpeed;

  // camera only bleeds into generative scenes when explicitly routed there
  u.uCamFeed.value = camera.enabled && camera.sendToEngine ? camera.feedToColor : 0;
  u.uCamMirror.value = camera.mirror ? 1 : 0;
}

export function applyInteraction(u: Uniforms, i: InteractionParams) {
  u.uForce.value = i.elasticity;
}

const b = (v: boolean) => (v ? 1 : 0);

/** Push the modular Camera FX config into uniforms. */
export function applyCamFx(u: Uniforms, c: CamFx) {
  u.uDsOn.value = b(c.distort.on); u.uDsTouch.value = c.distort.touch; u.uDsBass.value = c.distort.bass; u.uDsJitter.value = c.distort.jitter;
  u.uHtOn.value = b(c.halftone.on); u.uHtSize.value = c.halftone.size; u.uHtAngle.value = c.halftone.angle; u.uHtShape.value = c.halftone.shape; u.uHtAudio.value = c.halftone.audio;
  u.uDmOn.value = b(c.dotmatrix.on); u.uDmDensity.value = c.dotmatrix.density; u.uDmGlow.value = c.dotmatrix.glow; u.uDmAudio.value = c.dotmatrix.audio;
  u.uDiOn.value = b(c.dither.on); u.uDiAlgo.value = c.dither.algo; u.uDiScale.value = c.dither.scale; u.uDiThresh.value = c.dither.threshold; u.uDiContrast.value = c.dither.contrast; u.uDiNoise.value = c.dither.noise; u.uDiAudio.value = c.dither.audio;
  u.uEdOn.value = b(c.edge.on); u.uEdStrength.value = c.edge.strength; u.uEdThick.value = c.edge.thickness; u.uEdGlow.value = c.edge.glow; u.uEdInvert.value = b(c.edge.invert); u.uEdAudio.value = c.edge.audio;
  u.uPoOn.value = b(c.posterize.on); u.uPoLevels.value = c.posterize.levels; u.uPoAudio.value = c.posterize.audio;
  u.uThOn.value = b(c.threshold.on); u.uThValue.value = c.threshold.value; u.uThSoft.value = c.threshold.soft; u.uThInvert.value = b(c.threshold.invert); u.uThAudio.value = c.threshold.audio;
  u.uMoOn.value = b(c.mono.on); u.uMoTint.value = c.mono.tint; u.uMoGamma.value = c.mono.gamma;
  u.uPsOn.value = b(c.pixelsort.on); u.uPsAmount.value = c.pixelsort.amount; u.uPsThresh.value = c.pixelsort.threshold; u.uPsDir.value = c.pixelsort.direction; u.uPsSpeed.value = c.pixelsort.speed;
  u.uChOn.value = b(c.chroma.on); u.uChAmount.value = c.chroma.amount; u.uChAudio.value = c.chroma.audio;
  u.uScOn.value = b(c.scan.on); u.uScIntensity.value = c.scan.intensity; u.uScSpacing.value = c.scan.spacing; u.uScThick.value = c.scan.thickness;
  u.uCrtOn.value = b(c.crt.on); u.uCrtCurve.value = c.crt.curvature; u.uCrtGlow.value = c.crt.glow;
  u.uBlOn.value = b(c.bloom.on); u.uBlAmount.value = c.bloom.amount; u.uBlAudio.value = c.bloom.audio;
  u.uGrOn.value = b(c.grain.on); u.uGrAmount.value = c.grain.amount;
}

/** Push per-frame runtime signals (audio/pointer/camera/time) into uniforms. */
export function applySignals(u: Uniforms, time: number) {
  u.uTime.value = time;
  u.uBass.value = signals.bass;
  u.uMid.value = signals.mid;
  u.uTreble.value = signals.treble;
  u.uRms.value = signals.rms;
  u.uBeat.value = signals.beat;

  (u.uPointer.value as THREE.Vector2).set(signals.pointerX, signals.pointerY);
  u.uPointerDown.value = signals.pointerDown;
  (u.uPointerVel.value as THREE.Vector2).set(signals.pointerVelX, signals.pointerVelY);

  u.uCam.value = signals.camTexture ?? DEFAULT_TEX;
  u.uCamActive.value = signals.camActive ? 1 : 0;
  // hand motion reinforces camera-motion so every scene reacts to the body
  u.uCamMotion.value = Math.max(signals.camMotion, signals.hands.energy * 0.8);
  u.uCamBright.value = signals.camBrightness;

  // hand positions (uv -> ndc) for any scene that wants them
  const h = signals.hands;
  (u.uHand0.value as THREE.Vector4).set(
    h.h0.x * 2 - 1, h.h0.y * 2 - 1, h.h0.open, Math.min(2, h.h0.speed)
  );
  (u.uHand1.value as THREE.Vector4).set(
    h.h1.x * 2 - 1, h.h1.y * 2 - 1, h.h1.open, Math.min(2, h.h1.speed)
  );
  u.uHandCount.value = h.active ? h.count : 0;
  u.uHandEnergy.value = h.energy;

  u.uTouch.value = signals.touchTexture ?? DEFAULT_TEX;
  u.uTouchActive.value = signals.touchTexture ? 1 : 0;
}
