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
  visual engine. **Raw Camera** shows the clean image; **Camera FX** is a true
  multi-pass, **reorderable** chain (drag & drop): Distort, Halftone, Dot Matrix,
  Dither (Bayer/Ordered/Atkinson/Random), Edge, Posterize, Threshold, Monochrome,
  Pixel Sort, Chromatic Aberration, Scanlines, CRT, Bloom and Film Grain. Every effect
  is an independent module with its own ON/OFF, parameters and audio routing, and order
  matters (Halftone→Dither ≠ Dither→Halftone). Nothing is on by default — an empty chain
  is just Raw Camera. A **Send to Visual Engine** toggle optionally feeds the camera
  into the generative scenes; off by default so the two systems stay fully independent.
- **Clay Morphing / Digital Clay** — living soft-matter with three modes: a raymarched
  metaball **Sculpture** you sculpt with your hands; **Clay Camera**, where your
  segmented body (background removed) is rebuilt as a clay relief; and **Clay Halftone**,
  the clay body with its surface built from halftone dots (screenprint look). Mass is
  conserved — hands DENT and displace the clay (dimple + surrounding bulge), they never
  carve it away. Audio drives it hard: bass separates/inflates/pulses the masses, mids
  reorganise the morph, treble vibrates the surface; with no sound it settles into a
  stable sculpture, with sound it comes alive (energy envelope). Seven materials reshade
  it: Clay, Wax, Mercury, Gelatin, Biological, Lava, Chrome.
- **Silhouette Halftone** — segments the person (MediaPipe Selfie Segmenter), discards
  the background/room, and rebuilds the body **entirely out of halftone dots** over a
  flat poster background — screenprint / offset / editorial look, not a webcam filter.
  Dark areas make bigger dots, light areas smaller (true halftone). Colour modes:
  Black/White (with invert), Duotone and Tritone with custom inks. Bass expands the
  dots, mids change density, treble adds detail — the figure stays recognisable.
- **Artistic Pixel Sort** — a real span-based pixel-sort (not a smear): pixels stream
  along the sort axis within runs that stay above a brightness/colour threshold, so the
  image fragments into the characteristic streaks and sweeps. Modes: Horizontal,
  Vertical, Radial, Directional, Noise-Driven and **Motion-Driven** — the webcam's
  per-pixel motion map (your silhouette) drives streak direction and length, so moving
  your arm physically drags pixels. Controls: threshold, sort length, direction, speed,
  density, brightness/colour/motion influence; bass lengthens sweeps, treble fragments.
- **Audio-awakened Particle Flow** — the particle system sleeps into a stable, clean
  base shape with minimal elegant motion when there's no sound, and *wakes up* with the
  music: bass drives big expansion/compression, mids drive morphing and reorganisation,
  treble adds fine vibration. Louder = more transformation. When the music stops it
  relaxes gradually back to rest (fast attack, slow release) instead of freezing.
- **Depth / Focus Halftone** — an optional halftone mode with cinematic depth of field:
  dots are large near a focus point and shrink + densify toward the edges. The focus can
  follow the mouse, the tracked fingertip, or be placed manually, and bass expands the
  focus radius. Controls: center size, edge size, falloff, focus radius/softness/position.
- **Self-healing Noise Field** — the smoke can be pushed, smeared and tunnelled, but it
  preserves a minimum energy (never collapses to black) and the fluid relaxes back to
  equilibrium so it always reorganises toward its base state. Tunable via Energy
  Preservation, Return To Base, Equilibrium and Fluid Persistence.
- **Hand-gesture sculpting** — MediaPipe hand tracking drives a continuous expansion
  signal: open palm / hands apart expands and separates a scene, fist / hands together
  compresses and densifies it. It's progressive (10%…100% open) and applies across
  Particle Flow, Noise Field, Liquid Metal, Raymarch and the Camera FX distortion —
  like modelling a living digital substance in the air.
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
