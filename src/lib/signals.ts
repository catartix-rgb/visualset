// A single mutable object shared between the audio engine, webcam, pointer input
// and the render loop. Per-frame values must NOT go through React state, so they
// live here and are read directly inside useFrame.

import type { Texture } from "three";

export interface Hand {
  present: boolean;
  x: number; // palm center, uv 0..1
  y: number; // uv 0..1 (y up)
  tipX: number; // index fingertip, uv 0..1
  tipY: number;
  open: number; // 0 = fist, 1 = open palm
  speed: number; // uv/sec magnitude
  pinch: number; // thumb-index distance, normalized (0 = pinched)
}

export interface HandSignals {
  active: boolean;
  count: number;
  h0: Hand;
  h1: Hand;
  spread: number; // distance between two palms (uv), 0 if <2 hands
  spreadVel: number; // d(spread)/dt
  axis: number; // angle of the line between hands (radians)
  axisVel: number; // angular velocity of that line -> rotation gestures
  swirl: number; // single-hand angular velocity around screen center -> vortex
  energy: number; // overall hand motion energy 0..1 (for global reactivity)
  expansion: number; // -1 (compress/fist/hands together) .. +1 (expand/open/apart)
}

function emptyHand(): Hand {
  return { present: false, x: 0.5, y: 0.5, tipX: 0.5, tipY: 0.5, open: 0.5, speed: 0, pinch: 1 };
}

export interface Signals {
  time: number;

  // Audio (normalised 0..1, already smoothed + gained)
  bass: number;
  mid: number;
  treble: number;
  rms: number;
  beat: number; // decays from 1 toward 0 after each detected beat
  audioActive: boolean;

  // Pointer / touch (uv space 0..1, y up)
  pointerX: number;
  pointerY: number;
  pointerDown: number; // 0 or 1
  pointerVelX: number;
  pointerVelY: number;

  // Camera
  camMotion: number; // overall frame-difference energy 0..1
  camBrightness: number;
  camTexture: Texture | null;
  motionTexture: Texture | null; // per-cell webcam motion map (silhouette movement)
  camActive: boolean;

  // Hand tracking (MediaPipe). Positions in uv space 0..1, y up.
  hands: HandSignals;

  // Persistent interaction field (RG = force vector, B = ripple energy), updated
  // by TouchField from pointer + fingertips. Scenes sample it to be deformable.
  touchTexture: Texture | null;

  // Performance
  fps: number;
  quality: number; // resolution scale multiplier 0.5..1
}

export const signals: Signals = {
  time: 0,
  bass: 0,
  mid: 0,
  treble: 0,
  rms: 0,
  beat: 0,
  audioActive: false,
  pointerX: 0.5,
  pointerY: 0.5,
  pointerDown: 0,
  pointerVelX: 0,
  pointerVelY: 0,
  camMotion: 0,
  camBrightness: 0,
  camTexture: null,
  motionTexture: null,
  camActive: false,
  hands: {
    active: false,
    count: 0,
    h0: emptyHand(),
    h1: emptyHand(),
    spread: 0,
    spreadVel: 0,
    axis: 0,
    axisVel: 0,
    swirl: 0,
    energy: 0,
    expansion: 0,
  },
  touchTexture: null,
  fps: 60,
  quality: 1,
};

/** Exponential smoothing helper used across the input subsystems. */
export function smooth(prev: number, next: number, factor: number): number {
  return prev + (next - prev) * factor;
}
