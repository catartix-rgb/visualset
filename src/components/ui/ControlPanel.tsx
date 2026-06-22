"use client";
import { useControls, folder } from "leva";
import { useEffect } from "react";
import { useStore } from "@/store/useStore";
import { PALETTES, paletteByName } from "@/lib/palettes";

/**
 * Registers all Leva controls and binds them to the Zustand store. Rendered with a
 * key of `${seed}:${sceneId}` so the panel re-initialises to fresh values whenever
 * "Generate", a scene switch, or a preset load changes the underlying params.
 * Renders nothing itself — the actual panel chrome is the <Leva/> element in App.
 */
export function ControlPanel() {
  const p = useStore.getState().params;
  const a = useStore.getState().audio;
  const c = useStore.getState().camera;
  const setParams = useStore((s) => s.setParams);
  const setParam = useStore((s) => s.setParam);
  const setAudioMap = useStore((s) => s.setAudioMap);
  const setCameraMap = useStore((s) => s.setCameraMap);

  const paletteOptions = PALETTES.map((x) => x.name);

  useControls({
    Look: folder({
      palette: {
        value: p.paletteName,
        options: paletteOptions,
        onChange: (name: string) => {
          const pal = paletteByName(name);
          setParams({ paletteName: name, colors: pal.colors, bg: pal.colors[0] });
        },
      },
      speed: { value: p.speed, min: 0, max: 3, onChange: (v: number) => setParam("speed", v) },
      scale: { value: p.scale, min: 0.2, max: 4, onChange: (v: number) => setParam("scale", v) },
      complexity: {
        value: p.complexity, min: 1, max: 6, step: 1,
        onChange: (v: number) => setParam("complexity", v),
      },
      distortion: { value: p.distortion, min: 0, max: 2, onChange: (v: number) => setParam("distortion", v) },
      symmetry: { value: p.symmetry, min: 2, max: 16, step: 1, onChange: (v: number) => setParam("symmetry", v) },
      flow: { value: p.flow, min: 0, max: 3, onChange: (v: number) => setParam("flow", v) },
      trail: { value: p.trail, min: 0.7, max: 0.99, onChange: (v: number) => setParam("trail", v) },
    }),
    Grade: folder(
      {
        glow: { value: p.glow, min: 0, max: 2, onChange: (v: number) => setParam("glow", v) },
        contrast: { value: p.contrast, min: 0.5, max: 2, onChange: (v: number) => setParam("contrast", v) },
        saturation: { value: p.saturation, min: 0, max: 2, onChange: (v: number) => setParam("saturation", v) },
        hueShift: { value: p.hueShift, min: -3.14, max: 3.14, onChange: (v: number) => setParam("hueShift", v) },
        grain: { value: p.grain, min: 0, max: 0.3, onChange: (v: number) => setParam("grain", v) },
        vignette: { value: p.vignette, min: 0, max: 1.5, onChange: (v: number) => setParam("vignette", v) },
      },
      { collapsed: true }
    ),
    "Audio Mapping": folder(
      {
        reactivity: { value: a.reactivity, min: 0, max: 3, onChange: (v: number) => setAudioMap({ reactivity: v }) },
        bassGain: { value: a.bassGain, min: 0, max: 3, onChange: (v: number) => setAudioMap({ bassGain: v }) },
        midGain: { value: a.midGain, min: 0, max: 3, onChange: (v: number) => setAudioMap({ midGain: v }) },
        trebleGain: { value: a.trebleGain, min: 0, max: 3, onChange: (v: number) => setAudioMap({ trebleGain: v }) },
        "bass→scale": { value: a.toScale, min: 0, max: 2, onChange: (v: number) => setAudioMap({ toScale: v }) },
        "mid→distort": { value: a.toDistortion, min: 0, max: 2, onChange: (v: number) => setAudioMap({ toDistortion: v }) },
        "treble→glow": { value: a.toGlow, min: 0, max: 2, onChange: (v: number) => setAudioMap({ toGlow: v }) },
        "rms→speed": { value: a.toSpeed, min: 0, max: 2, onChange: (v: number) => setAudioMap({ toSpeed: v }) },
      },
      { collapsed: true }
    ),
    "Camera Mapping": folder(
      {
        feedToColor: { value: c.feedToColor, min: 0, max: 1, onChange: (v: number) => setCameraMap({ feedToColor: v }) },
        motionToForce: { value: c.motionToForce, min: 0, max: 3, onChange: (v: number) => setCameraMap({ motionToForce: v }) },
        motionToDistort: { value: c.motionToDistortion, min: 0, max: 3, onChange: (v: number) => setCameraMap({ motionToDistortion: v }) },
        mirror: { value: c.mirror, onChange: (v: boolean) => setCameraMap({ mirror: v }) },
      },
      { collapsed: true }
    ),
  });

  // Nothing to render; binding-only component.
  useEffect(() => () => void 0, []);
  return null;
}
