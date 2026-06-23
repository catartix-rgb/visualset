"use client";
import { useControls, folder } from "leva";
import { useStore } from "@/store/useStore";
import { PALETTES, paletteByName } from "@/lib/palettes";
import { DITHER_ALGOS, HALFTONE_SHAPES, HALFTONE_COLOR_MODES, PIXELSORT_MODES, FOCUS_MODES, CLAY_MATERIALS, type CamFxStage } from "@/lib/fx";

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
  const nf = useStore.getState().noise;
  const clay = useStore.getState().clay;
  const fx = useStore.getState().camfx;
  const sceneId = useStore.getState().sceneId;

  const setParams = useStore((s) => s.setParams);
  const setParam = useStore((s) => s.setParam);
  const setAudioMap = useStore((s) => s.setAudioMap);
  const setCameraMap = useStore((s) => s.setCameraMap);
  const setInteraction = useStore((s) => s.setInteraction);
  const setNoise = useStore((s) => s.setNoise);
  const setClay = useStore((s) => s.setClay);
  const setCamFx = useStore((s) => s.setCamFx);

  const paletteOptions = PALETTES.map((x) => x.name);

  // Bind a camfx parameter. Leva needs every leaf key globally unique, so the schema
  // key is prefixed (e.g. htSize) while `label` keeps a clean display name. On/off and
  // ordering live in the FX Chain panel, not here.
  const cfp = (stage: CamFxStage, key: string, label: string, opts: object = {}) => ({
    value: (fx[stage] as unknown as Record<string, number>)[key],
    label,
    ...opts,
    onChange: (v: number) => setCamFx(stage, { [key]: v } as never),
  });
  const cfb = (stage: CamFxStage, key: string, label: string) => ({
    value: (fx[stage] as unknown as Record<string, boolean>)[key],
    label,
    onChange: (v: boolean) => setCamFx(stage, { [key]: v } as never),
  });
  const sel = (stage: CamFxStage, key: string, label: string, opts: readonly string[]) => ({
    value: opts[(fx[stage] as unknown as Record<string, number>)[key]],
    label,
    options: opts as unknown as string[],
    onChange: (n: string) => setCamFx(stage, { [key]: opts.indexOf(n) } as never),
  });

  const camFxFolder =
    sceneId === "camerafx"
      ? {
          "Camera FX": folder(
            {
              Distort: folder(
                {
                  dsTouch: cfp("distort", "touch", "touch", { min: 0, max: 3 }),
                  dsBass: cfp("distort", "bass", "bass", { min: 0, max: 3 }),
                  dsJitter: cfp("distort", "jitter", "jitter", { min: 0, max: 3 }),
                },
                { collapsed: true }
              ),
              Halftone: folder(
                {
                  htSize: cfp("halftone", "size", "size", { min: 0.05, max: 1 }),
                  htAngle: cfp("halftone", "angle", "angle", { min: 0, max: 3.14 }),
                  htShape: sel("halftone", "shape", "shape", HALFTONE_SHAPES),
                  htAudio: cfp("halftone", "audio", "audio", { min: 0, max: 2 }),
                  htDepth: cfb("halftone", "depth", "depth focus"),
                  htCenterSize: cfp("halftone", "centerSize", "center size", { min: 0.1, max: 1 }),
                  htEdgeSize: cfp("halftone", "edgeSize", "edge size", { min: 0.02, max: 1 }),
                  htFalloff: cfp("halftone", "falloff", "falloff", { min: 0.2, max: 4 }),
                  htFocusR: cfp("halftone", "focusRadius", "focus radius", { min: 0.05, max: 1 }),
                  htFocusSoft: cfp("halftone", "focusSoft", "focus softness", { min: 0.01, max: 0.6 }),
                  htFocusMode: sel("halftone", "focusMode", "focus follows", FOCUS_MODES),
                  htFocusX: cfp("halftone", "focusX", "focus x", { min: 0, max: 1 }),
                  htFocusY: cfp("halftone", "focusY", "focus y", { min: 0, max: 1 }),
                  htSil: cfb("halftone", "silhouette", "silhouette (body)"),
                  htColorMode: sel("halftone", "colorMode", "color mode", HALFTONE_COLOR_MODES),
                  htInvert: cfb("halftone", "invert", "invert (B/W)"),
                  htBg: { value: fx.halftone.bg, label: "bg color", onChange: (v: string) => setCamFx("halftone", { bg: v } as never) },
                  htInk1: { value: fx.halftone.ink1, label: "ink 1", onChange: (v: string) => setCamFx("halftone", { ink1: v } as never) },
                  htInk2: { value: fx.halftone.ink2, label: "ink 2", onChange: (v: string) => setCamFx("halftone", { ink2: v } as never) },
                },
                { collapsed: true }
              ),
              "Dot Matrix": folder(
                {
                  dmDensity: cfp("dotmatrix", "density", "density", { min: 20, max: 240, step: 1 }),
                  dmGlow: cfp("dotmatrix", "glow", "glow", { min: 0, max: 2 }),
                  dmAudio: cfp("dotmatrix", "audio", "audio", { min: 0, max: 2 }),
                },
                { collapsed: true }
              ),
              Dither: folder(
                {
                  diAlgo: sel("dither", "algo", "algorithm", DITHER_ALGOS),
                  diScale: cfp("dither", "scale", "scale", { min: 0.5, max: 4 }),
                  diThresh: cfp("dither", "threshold", "threshold", { min: 0, max: 1 }),
                  diContrast: cfp("dither", "contrast", "contrast", { min: 0.2, max: 3 }),
                  diNoise: cfp("dither", "noise", "noise", { min: 0, max: 1 }),
                  diAudio: cfp("dither", "audio", "audio", { min: 0, max: 2 }),
                },
                { collapsed: true }
              ),
              "Edge Detection": folder(
                {
                  edStrength: cfp("edge", "strength", "strength", { min: 0, max: 12 }),
                  edThick: cfp("edge", "thickness", "thickness", { min: 0, max: 4 }),
                  edGlow: cfp("edge", "glow", "glow", { min: 0, max: 3 }),
                  edInvert: cfb("edge", "invert", "invert"),
                  edAudio: cfp("edge", "audio", "audio", { min: 0, max: 2 }),
                },
                { collapsed: true }
              ),
              Posterize: folder(
                {
                  poLevels: cfp("posterize", "levels", "levels", { min: 2, max: 12, step: 1 }),
                  poAudio: cfp("posterize", "audio", "audio", { min: 0, max: 2 }),
                },
                { collapsed: true }
              ),
              Threshold: folder(
                {
                  thValue: cfp("threshold", "value", "value", { min: 0, max: 1 }),
                  thSoft: cfp("threshold", "soft", "soft", { min: 0, max: 0.3 }),
                  thInvert: cfb("threshold", "invert", "invert"),
                  thAudio: cfp("threshold", "audio", "audio", { min: 0, max: 2 }),
                },
                { collapsed: true }
              ),
              Monochrome: folder(
                {
                  moTint: cfp("mono", "tint", "tint", { min: 0, max: 1 }),
                  moGamma: cfp("mono", "gamma", "gamma", { min: 0.3, max: 2.5 }),
                },
                { collapsed: true }
              ),
              "Pixel Sort": folder(
                {
                  psMode: sel("pixelsort", "mode", "mode", PIXELSORT_MODES),
                  psThresh: cfp("pixelsort", "threshold", "threshold", { min: 0, max: 1 }),
                  psLength: cfp("pixelsort", "sortLength", "sort length", { min: 0, max: 1 }),
                  psAngle: cfp("pixelsort", "angle", "direction", { min: 0, max: 1 }),
                  psSpeed: cfp("pixelsort", "speed", "speed", { min: 0, max: 2 }),
                  psDensity: cfp("pixelsort", "density", "density", { min: 0, max: 1 }),
                  psBright: cfp("pixelsort", "brightness", "brightness", { min: 0, max: 2 }),
                  psColor: cfp("pixelsort", "color", "color", { min: 0, max: 1 }),
                  psMotion: cfp("pixelsort", "motion", "motion", { min: 0, max: 3 }),
                  psAmount: cfp("pixelsort", "amount", "amount", { min: 0, max: 1 }),
                  psAudio: cfp("pixelsort", "audio", "audio", { min: 0, max: 2 }),
                },
                { collapsed: true }
              ),
              "Chromatic Aberration": folder(
                {
                  chAmount: cfp("chroma", "amount", "amount", { min: 0, max: 1 }),
                  chAudio: cfp("chroma", "audio", "audio", { min: 0, max: 2 }),
                },
                { collapsed: true }
              ),
              Scanlines: folder(
                {
                  scIntensity: cfp("scan", "intensity", "intensity", { min: 0, max: 1 }),
                  scSpacing: cfp("scan", "spacing", "spacing", { min: 100, max: 1400, step: 10 }),
                  scThick: cfp("scan", "thickness", "thickness", { min: 0, max: 1 }),
                },
                { collapsed: true }
              ),
              CRT: folder(
                {
                  crCurve: cfp("crt", "curvature", "curvature", { min: 0, max: 1 }),
                  crGlow: cfp("crt", "glow", "glow", { min: 0, max: 2 }),
                },
                { collapsed: true }
              ),
              Bloom: folder(
                {
                  blAmount: cfp("bloom", "amount", "amount", { min: 0, max: 2 }),
                  blAudio: cfp("bloom", "audio", "audio", { min: 0, max: 2 }),
                },
                { collapsed: true }
              ),
              "Film Grain": folder(
                {
                  grAmount: cfp("grain", "amount", "amount", { min: 0, max: 0.3 }),
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
          equilibrium: { value: ip.equilibrium, min: 0, max: 1, onChange: (v: number) => setInteraction({ equilibrium: v }) },
        },
        { collapsed: true }
      ),
      ...(sceneId === "noisefield"
        ? {
            "Noise Recovery": folder(
              {
                energyPreservation: { value: nf.energyFloor, min: 0, max: 0.5, onChange: (v: number) => setNoise({ energyFloor: v }) },
                returnToBase: { value: nf.returnStrength, min: 0, max: 1, onChange: (v: number) => setNoise({ returnStrength: v }) },
              },
              { collapsed: false }
            ),
          }
        : {}),
      ...(sceneId === "clay"
        ? {
            Clay: folder(
              {
                material: {
                  value: CLAY_MATERIALS[clay.material],
                  options: CLAY_MATERIALS as unknown as string[],
                  onChange: (n: string) => setClay({ material: CLAY_MATERIALS.indexOf(n as never) }),
                },
                softness: { value: clay.softness, min: 0.1, max: 1, onChange: (v: number) => setClay({ softness: v }) },
                detail: { value: clay.detail, min: 0, max: 1, onChange: (v: number) => setClay({ detail: v }) },
              },
              { collapsed: false }
            ),
          }
        : {}),
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
