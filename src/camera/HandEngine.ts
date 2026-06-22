import type { HandLandmarker as HandLandmarkerT } from "@mediapipe/tasks-vision";
import { signals, smooth } from "@/lib/signals";
import type { Hand } from "@/lib/signals";
import { getWebcamEngine } from "./WebcamEngine";

// Hand tracking via MediaPipe Vision Tasks. Runs on the shared webcam video element,
// extracts per-hand position / openness / pinch / velocity, and derives two-hand
// gestures (spread, rotation axis, vortex swirl) into the signals bus. All the
// "manipulate digital matter with your hands" forces are computed downstream from
// these signals (see ParticleScene / uniforms).

const WASM_CDN =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

type LM = { x: number; y: number; z: number };

function dist(a: LM, b: LM) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export class HandEngine {
  private landmarker: HandLandmarkerT | null = null;
  private raf = 0;
  private lastVideoTime = -1;
  private lastT = 0;
  loading = false;

  // previous-frame state for velocities
  private prev = {
    p0: [0.5, 0.5],
    p1: [0.5, 0.5],
    spread: 0,
    axis: 0,
    swirlAngle: 0,
  };

  async start() {
    // make sure the camera is running (hand tracking shares its video)
    const cam = getWebcamEngine();
    if (!cam.isRunning) await cam.start();

    if (!this.landmarker) {
      this.loading = true;
      // Lazy-load the (heavy) MediaPipe module only when hand tracking is enabled.
      const { HandLandmarker, FilesetResolver } = await import(
        "@mediapipe/tasks-vision"
      );
      const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
      this.landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
        numHands: 2,
        runningMode: "VIDEO",
        minHandDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      this.loading = false;
    }
    signals.hands.active = true;
    this.loop();
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    const h = signals.hands;
    h.active = false;
    h.count = 0;
    h.h0.present = false;
    h.h1.present = false;
    h.spread = h.spreadVel = h.axisVel = h.swirl = h.energy = 0;
  }

  private analyseHand(lm: LM[], out: Hand, prev: number[], dt: number): void {
    // palm center: mean of wrist + finger MCPs
    const cx = (lm[0].x + lm[5].x + lm[9].x + lm[13].x + lm[17].x) / 5;
    const cy = (lm[0].y + lm[5].y + lm[9].y + lm[13].y + lm[17].y) / 5;
    const palm = dist(lm[0], lm[9]) + 1e-4; // reference size

    // openness: tips distance from palm center, normalized by palm size
    const tips = [8, 12, 16, 20];
    let spreadTips = 0;
    for (const t of tips) spreadTips += Math.hypot(lm[t].x - cx, lm[t].y - cy);
    spreadTips /= tips.length;
    const open = Math.min(1, Math.max(0, (spreadTips / palm - 0.7) / 1.1));

    const pinch = Math.min(1, dist(lm[4], lm[8]) / palm);

    // mirror x (display is mirrored) and flip y to y-up
    const ux = 1 - cx;
    const uy = 1 - cy;

    const sp = Math.hypot(ux - prev[0], uy - prev[1]) / Math.max(dt, 1e-3);
    prev[0] = ux;
    prev[1] = uy;

    out.present = true;
    out.x = smooth(out.x, ux, 0.5);
    out.y = smooth(out.y, uy, 0.5);
    out.open = smooth(out.open, open, 0.4);
    out.pinch = smooth(out.pinch, pinch, 0.4);
    out.speed = smooth(out.speed, sp, 0.4);
  }

  private loop = () => {
    const cam = getWebcamEngine();
    const video = cam.video;
    const h = signals.hands;

    if (this.landmarker && video && video.readyState >= 2) {
      const now = performance.now();
      const dt = (now - this.lastT) / 1000 || 1 / 60;
      this.lastT = now;

      if (video.currentTime !== this.lastVideoTime) {
        this.lastVideoTime = video.currentTime;
        const res = this.landmarker.detectForVideo(video, now);
        const hands = res.landmarks ?? [];
        h.count = hands.length;

        if (hands.length >= 1) this.analyseHand(hands[0] as LM[], h.h0, this.prev.p0, dt);
        else h.h0.present = false;

        if (hands.length >= 2) this.analyseHand(hands[1] as LM[], h.h1, this.prev.p1, dt);
        else h.h1.present = false;

        // two-hand gestures
        if (hands.length >= 2) {
          const dx = h.h1.x - h.h0.x;
          const dy = h.h1.y - h.h0.y;
          const spread = Math.hypot(dx, dy);
          const axis = Math.atan2(dy, dx);
          h.spreadVel = smooth(h.spreadVel, (spread - this.prev.spread) / dt, 0.3);
          let dAxis = axis - this.prev.axis;
          if (dAxis > Math.PI) dAxis -= 2 * Math.PI;
          if (dAxis < -Math.PI) dAxis += 2 * Math.PI;
          h.axisVel = smooth(h.axisVel, dAxis / dt, 0.3);
          h.spread = smooth(h.spread, spread, 0.4);
          h.axis = axis;
          this.prev.spread = spread;
          this.prev.axis = axis;
          h.swirl = smooth(h.swirl, 0, 0.2);
        } else if (hands.length === 1) {
          // single-hand circular motion -> vortex swirl
          const ang = Math.atan2(h.h0.y - 0.5, h.h0.x - 0.5);
          let dAng = ang - this.prev.swirlAngle;
          if (dAng > Math.PI) dAng -= 2 * Math.PI;
          if (dAng < -Math.PI) dAng += 2 * Math.PI;
          this.prev.swirlAngle = ang;
          h.swirl = smooth(h.swirl, dAng / dt, 0.25);
          h.spread = smooth(h.spread, 0, 0.2);
          h.spreadVel = smooth(h.spreadVel, 0, 0.2);
          h.axisVel = smooth(h.axisVel, 0, 0.2);
        } else {
          h.swirl = smooth(h.swirl, 0, 0.2);
          h.spread = smooth(h.spread, 0, 0.2);
        }

        const e = (h.h0.present ? h.h0.speed : 0) + (h.h1.present ? h.h1.speed : 0);
        h.energy = smooth(h.energy, Math.min(1, e * 0.6), 0.3);
      }
    }
    this.raf = requestAnimationFrame(this.loop);
  };
}

let engine: HandEngine | null = null;
export function getHandEngine(): HandEngine {
  if (!engine) engine = new HandEngine();
  return engine;
}
