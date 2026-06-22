import * as THREE from "three";
import type { AudioMapping, CameraMapping, VisualParams } from "@/lib/types";
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

    uAToScale: { value: 0.6 },
    uAToDistort: { value: 0.8 },
    uAToGlow: { value: 1 },
    uAToSpeed: { value: 0.5 },

    uFeedback: { value: null },
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

  u.uAToScale.value = audio.toScale;
  u.uAToDistort.value = audio.toDistortion;
  u.uAToGlow.value = audio.toGlow;
  u.uAToSpeed.value = audio.toSpeed;

  u.uCamFeed.value = camera.enabled ? camera.feedToColor : 0;
  u.uCamMirror.value = camera.mirror ? 1 : 0;
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
  u.uCamMotion.value = signals.camMotion;
  u.uCamBright.value = signals.camBrightness;
}
