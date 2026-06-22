# VISUALSET

A real-time **generative audio-visual instrument** for the browser — inspired by
TouchDesigner, Notch and interactive museum installations. Feed it sound (mic or a
file) or your webcam, hit **Generate**, and perform. Every look is reproducible from
a short **seed**.

Built with Next.js 15 (App Router) · TypeScript · React 19 · Three.js · React Three
Fiber · Drei · custom GLSL · Web Audio API · WebRTC · Zustand · Leva · Tailwind ·
Framer Motion. Deploys to Vercel as a static-ish client app (all rendering is on the
GPU in the browser).

---

## ✨ Features

- **9 modular visual engines** — living-smoke Noise Field, Nebula, Raymarch,
  Kaleidoscope, fluid Liquid Metal (physical audio-driven surface), Geometric,
  Feedback/Trails/Glitch, an evolutionary GPU Particle Flow that morphs between
  cloud/sphere/tunnel/organism/galaxy/lattice, and **Camera FX** (halftone, dot
  matrix, ASCII, edge, posterize, threshold, mono) that turns the webcam into
  audio-reactive material.
- **GPU fluid interaction field ("digital pond")** — pointer and index-fingertip
  input deposit velocity + energy into a 512² semi-Lagrangian fluid sim (advection +
  vorticity + decay) sampled bilinearly so deformation is smooth and grid-free. Every
  scene reads it, so you can drag particles, carve tunnels in the smoke, raise deep
  liquid waves and spin vortices by touch — with editable Force, Radius, Persistence,
  Turbulence, Fluidity and Elasticity.
- **Independent camera pipeline** — the camera is its own module, decoupled from the
  visual engine. **Raw Camera** shows the clean image; **Camera FX** is a stackable
  image-processing chain: Distort (optional, off by default), Halftone, Dot Matrix,
  Dither (Bayer/Ordered/Atkinson/Random), Edge, Posterize, Threshold, Monochrome,
  Pixel Sort, Chromatic Aberration, Scanlines, CRT, Bloom and Film Grain — each with
  its own ON/OFF, parameters and audio routing, like a TouchDesigner node chain. A
  **Send to Visual Engine** toggle optionally feeds the camera into particles / noise /
  liquid; off by default so the two systems stay fully independent.
- **Intelligent randomization** — `Generate` rolls a new **seed** that deterministically
  drives palette, motion, speed, distortion, symmetry and physics. Values are pulled
  from curated palettes and centre-biased ranges so results stay *art-directed*, never
  ugly. Lock the scene to re-roll just the parameters.
- **Audio-reactive** — mic, audio file (MP3/WAV/…). Real-time FFT extracts
  **bass / mid / treble / RMS** plus **beat detection**, mapped to scale, distortion,
  glow, speed, particle count and more — with sensitivity + per-band gain controls.
- **Camera-reactive** — webcam motion / optical-flow energy / brightness drive forces,
  distortion and particle turbulence; the live image can be fed into the look.
- **Interaction** — mouse & multitouch attract/repel/paint; full keyboard control.
- **TouchDesigner-style control panel** (Leva) — intensity, colour, contrast, glow,
  grain, vignette, speed, physics, audio mapping, camera mapping. Hideable.
- **Presets** — save full state (seed + params + mappings) to the browser, or export /
  import as JSON.
- **Performance mode** — fullscreen, no UI, cursor hidden. For VJ sets, installations,
  projection.
- **Recording** — PNG/JPG snapshots and WebM/MP4 video capture of the live canvas.
- **60 FPS target** — adaptive resolution + adaptive particle count scale quality down
  automatically when the GPU is under pressure.

---

## 🎹 Controls

| Key | Action | Key | Action |
|----|--------|----|--------|
| `Space` | Generate | `R` | Record video |
| `1–8` | Switch scene | `S` | Snapshot PNG |
| `F` | Freeze / resume | `M` | Toggle mic |
| `H` | Hide / show panel | `C` | Toggle webcam |
| `P` | Performance mode | `Esc` | Exit performance |
| `?` | Help | dbl-click | Toggle performance |

---

## 🗂 Architecture

```
app/                     Next.js App Router shell
  layout.tsx, page.tsx, globals.css
src/
  components/
    App.tsx              top-level: wires hooks, keyboard, layout
    VisualCanvas.tsx     R3F <Canvas> (preserveDrawingBuffer for capture)
    scenes/
      SceneRouter.tsx    selects the active engine + adaptive quality
      FragmentScene.tsx  fullscreen-quad renderer for shader scenes
      FeedbackScene.tsx  ping-pong FBO feedback / trails / glitch loop
      ParticleScene.tsx  120k GPU points advected by a curl flow-field
    ui/                  TopBar, ControlPanel (Leva), Meters, PresetShelf, Toast, Help
  shaders/
    common.ts            shared GLSL: noise toolbox, palette ramp, colour grading
    vertex.ts            fullscreen clip-space vertex shader
    uniforms.ts          uniform schema + store/signals → uniform bridge
    scenes/*.ts          one GLSL module per visual engine
  audio/                 AudioEngine (FFT + beat detection) + useAudio hook
  camera/                WebcamEngine (motion analysis + VideoTexture) + useWebcam hook
  generators/generate.ts seed → curated VisualParams
  hooks/                 usePointer, useAdaptiveQuality, useRecorder
  presets/presets.ts     save / load / export / import
  store/useStore.ts      Zustand global state
  lib/                   random (seeded RNG), palettes, signals bus, types
```

**Design note — the signals bus.** Per-frame audio/camera/pointer values live in a
single mutable object (`src/lib/signals.ts`), *not* React state, so the 60 FPS render
loop never triggers re-renders. React/Zustand only holds user-facing config.

### Adding a new scene
1. Write a fragment `main()` in `src/shaders/scenes/yourscene.ts` using the shared
   uniforms/helpers from `common.ts`.
2. Register it in `src/shaders/index.ts` (`FRAGMENTS`).
3. Add an entry to `SCENES` in `src/lib/types.ts` (and the `SceneId` union).
That's it — the router, controls, randomizer and capture all work automatically.

---

## 🚀 Run locally

```bash
npm install
npm run dev      # http://localhost:3000
```

> Mic & webcam require a **secure context**. `localhost` counts as secure, so dev works
> out of the box; in production you need HTTPS (Vercel provides it).

Build:

```bash
npm run build && npm start
```

---

## ▲ Deploy to Vercel

This is a standard Next.js app — zero config.

**Option A — Dashboard**
1. Push this folder to a Git repo (GitHub/GitLab/Bitbucket).
2. On <https://vercel.com/new>, import the repo.
3. Framework preset: **Next.js** (auto-detected). Build `next build`, output handled
   automatically. No environment variables required.
4. Deploy. You'll get an HTTPS URL where mic/webcam permissions work.

**Option B — CLI**
```bash
npm i -g vercel
vercel          # preview deploy
vercel --prod   # production
```

Notes:
- Everything runs client-side on the GPU; there are no server routes, secrets or
  databases to configure.
- MP4 recording depends on the browser advertising an MP4 encoder; otherwise the
  recorder transparently falls back to **WebM** (Chrome/Firefox default).

---

## 🧪 Tech & browser support

Chromium and Firefox give the best results (WebGL2 + MediaRecorder). Safari runs the
visuals and audio; some `captureStream`/codec features are more limited there.

## License

MIT — make things. Original generative work; no third-party artist assets are bundled.
