"use client";
import { useControls, folder } from "leva";
import { useStore } from "@/store/useStore";
import { PALETTES, paletteByName } from "@/lib/palettes";
import { DITHER_ALGOS, HALFTONE_SHAPES, SORT_DIRECTIONS, type CamFx, type CamFxStage } from "@/lib/fx";

/**
 * Registers all Leva controls and binds them to the store. Keyed by `${seed}:${sceneId}`
 * in App so it re-initialises to fresh values after Generate / scene switch / preset
 * load. Renders nothing — the panel chrome is the <Leva/> element in App.
 */
export function ControlPanel() {
  const p = useStore.getState().params;
  const a = useStore.getState().audio;
  const c = useStore.getState().camera;
  const ip = useStore.getState().interaction;
  const fx = useStore.getState().camfx;
  const sceneId = useStore.getState().sceneId;

  const setParams = useStore((s) => s.setParams);
  const setParam = useStore((s) => s.setParam);
  const setAudioMap = useStore((s) => s.setAudioMap);
  const setCameraMap = useStore((s) => s.setCameraMap);
  const setInteraction = useStore((s) => s.setInteraction);
  const setCamFx = useStore((s) => s.setCamFx);

  const paletteOptions = PALETTES.map((x) => x.name);

  // helpers to bind a camfx stage parameter
  const num = (stage: CamFxStage, key: string, opts: object) => ({
    value: (fx[stage] as unknown as Record<string, number>)[key],
    ...opts,
    onChange: (v: number) => setCamFx(stage, { [key]: v } as never),
  });
  const bool = (stage: CamFxStage, key: string) => ({
    value: (fx[stage] as unknown as Record<string, boolean>)[key],
    onChange: (v: boolean) => setCamFx(stage, { [key]: v } as never),
  });

  const camFxFolder =
    sceneId === "camerafx"
      ? {
          "Camera FX": folder(
            {
              Distort: folder(
                {
                  enabled: bool("distort", "on"),
                  touch: num("distort", "touch", { min: 0, max: 3 }),
                  bass: num("distort", "bass", { min: 0, max: 3 }),
                  jitter: num("distort", "jitter", { min: 0, max: 3 }),
                },
                { collapsed: true }
              ),
              Halftone: folder(
                {
                  enabled: bool("halftone", "on"),
                  size: num("halftone", "size", { min: 0.05, max: 1 }),
                  angle: num("halftone", "angle", { min: 0, max: 3.14 }),
                  shape: {
                    value: HALFTONE_SHAPES[fx.halftone.shape],
                    options: HALFTONE_SHAPES as unknown as string[],
                    onChange: (n: string) =>
                      setCamFx("halftone", { shape: HALFTONE_SHAPES.indexOf(n as never) }),
                  },
                  audio: num("halftone", "audio", { min: 0, max: 2 }),
                },
                { collapsed: true }
              ),
              "Dot Matrix": folder(
                {
                  enabled: bool("dotmatrix", "on"),
                  density: num("dotmatrix", "density", { min: 20, max: 240, step: 1 }),
                  glow: num("dotmatrix", "glow", { min: 0, max: 2 }),
                  audio: num("dotmatrix", "audio", { min: 0, max: 2 }),
                },
                { collapsed: true }
              ),
              Dither: folder(
                {
                  enabled: bool("dither", "on"),
                  algorithm: {
                    value: DITHER_ALGOS[fx.dither.algo],
                    options: DITHER_ALGOS as unknown as string[],
                    onChange: (n: string) =>
                      setCamFx("dither", { algo: DITHER_ALGOS.indexOf(n as never) }),
                  },
                  scale: num("dither", "scale", { min: 0.5, max: 4 }),
                  threshold: num("dither", "threshold", { min: 0, max: 1 }),
                  contrast: num("dither", "contrast", { min: 0.2, max: 3 }),
                  noise: num("dither", "noise", { min: 0, max: 1 }),
                  audio: num("dither", "audio", { min: 0, max: 2 }),
                },
                { collapsed: true }
              ),
              Edge: folder(
                {
                  enabled: bool("edge", "on"),
                  strength: num("edge", "strength", { min: 0, max: 12 }),
                  thickness: num("edge", "thickness", { min: 0, max: 4 }),
                  glow: num("edge", "glow", { min: 0, max: 3 }),
                  invert: bool("edge", "invert"),
                  audio: num("edge", "audio", { min: 0, max: 2 }),
                },
                { collapsed: true }
              ),
              Posterize: folder(
                {
                  enabled: bool("posterize", "on"),
                  levels: num("posterize", "levels", { min: 2, max: 12, step: 1 }),
                  audio: num("posterize", "audio", { min: 0, max: 2 }),
                },
                { collapsed: true }
              ),
              Threshold: folder(
                {
                  enabled: bool("threshold", "on"),
                  value: num("threshold", "value", { min: 0, max: 1 }),
                  soft: num("threshold", "soft", { min: 0, max: 0.3 }),
                  invert: bool("threshold", "invert"),
                  audio: num("threshold", "audio", { min: 0, max: 2 }),
                },
                { collapsed: true }
              ),
              Monochrome: folder(
                {
                  enabled: bool("mono", "on"),
                  tint: num("mono", "tint", { min: 0, max: 1 }),
                  gamma: num("mono", "gamma", { min: 0.3, max: 2.5 }),
                },
                { collapsed: true }
              ),
              "Pixel Sort": folder(
                {
                  enabled: bool("pixelsort", "on"),
                  direction: {
                    value: SORT_DIRECTIONS[fx.pixelsort.direction],
                    options: SORT_DIRECTIONS as unknown as string[],
                    onChange: (n: string) =>
                      setCamFx("pixelsort", { direction: SORT_DIRECTIONS.indexOf(n as never) }),
                  },
                  amount: num("pixelsort", "amount", { min: 0, max: 1 }),
                  threshold: num("pixelsort", "threshold", { min: 0, max: 1 }),
                  speed: num("pixelsort", "speed", { min: 0, max: 2 }),
                },
                { collapsed: true }
              ),
              "Chromatic Aberration": folder(
                {
                  enabled: bool("chroma", "on"),
                  amount: num("chroma", "amount", { min: 0, max: 1 }),
                  audio: num("chroma", "audio", { min: 0, max: 2 }),
                },
                { collapsed: true }
              ),
              Scanlines: folder(
                {
                  enabled: bool("scan", "on"),
                  intensity: num("scan", "intensity", { min: 0, max: 1 }),
                  spacing: num("scan", "spacing", { min: 100, max: 1400, step: 10 }),
                  thickness: num("scan", "thickness", { min: 0, max: 1 }),
                },
                { collapsed: true }
              ),
              CRT: folder(
                {
                  enabled: bool("crt", "on"),
                  curvature: num("crt", "curvature", { min: 0, max: 1 }),
                  glow: num("crt", "glow", { min: 0, max: 2 }),
                },
                { collapsed: true }
              ),
              Bloom: folder(
                {
                  enabled: bool("bloom", "on"),
                  amount: num("bloom", "amount", { min: 0, max: 2 }),
                  audio: num("bloom", "audio", { min: 0, max: 2 }),
                },
                { collapsed: true }
              ),
              "Film Grain": folder(
                {
                  enabled: bool("grain", "on"),
                  amount: num("grain", "amount", { min: 0, max: 0.3 }),
                },
                { collapsed: true }
              ),
            },
            { collapsed: false }
          ),
        }
      : {};

  useControls(
    {
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
        complexity: { value: p.complexity, min: 1, max: 6, step: 1, onChange: (v: number) => setParam("complexity", v) },
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
      Interaction: folder(
        {
          force: { value: ip.force, min: 0, max: 3, onChange: (v: number) => setInteraction({ force: v }) },
          radius: { value: ip.radius, min: 0.02, max: 0.25, onChange: (v: number) => setInteraction({ radius: v }) },
          persistence: { value: ip.persistence, min: 0.9, max: 0.998, onChange: (v: number) => setInteraction({ persistence: v }) },
          turbulence: { value: ip.turbulence, min: 0, max: 3, onChange: (v: number) => setInteraction({ turbulence: v }) },
          fluidity: { value: ip.fluidity, min: 0, max: 2, onChange: (v: number) => setInteraction({ fluidity: v }) },
          elasticity: { value: ip.elasticity, min: 0, max: 3, onChange: (v: number) => setInteraction({ elasticity: v }) },
        },
        { collapsed: true }
      ),
      ...camFxFolder,
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
          "send to engine": { value: c.sendToEngine, onChange: (v: boolean) => setCameraMap({ sendToEngine: v }) },
          feedToColor: { value: c.feedToColor, min: 0, max: 1, onChange: (v: number) => setCameraMap({ feedToColor: v }) },
          motionToForce: { value: c.motionToForce, min: 0, max: 3, onChange: (v: number) => setCameraMap({ motionToForce: v }) },
          motionToDistort: { value: c.motionToDistortion, min: 0, max: 3, onChange: (v: number) => setCameraMap({ motionToDistortion: v }) },
          mirror: { value: c.mirror, onChange: (v: boolean) => setCameraMap({ mirror: v }) },
        },
        { collapsed: true }
      ),
    } as never
  );

  return null;
}
