// A single mutable object shared between the audio engine, webcam, pointer input
// and the render loop. Per-frame values must NOT go through React state, so they
// live here and are read directly inside useFrame.

import type { Texture } from "three";

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
  camActive: boolean;

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
  camActive: false,
  fps: 60,
  quality: 1,
};

/** Exponential smoothing helper used across the input subsystems. */
export function smooth(prev: number, next: number, factor: number): number {
  return prev + (next - prev) * factor;
}
