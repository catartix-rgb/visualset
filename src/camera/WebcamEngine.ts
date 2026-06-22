import * as THREE from "three";
import { signals, smooth } from "@/lib/signals";

// Webcam capture + lightweight motion analysis. We keep a full-res VideoTexture
// for "feed into the look", and a tiny offscreen canvas for frame-difference
// motion energy / brightness (cheap optical-flow proxy) sampled every frame.

const SAMPLE = 48; // analysis grid is SAMPLE x SAMPLE

export class WebcamEngine {
  video: HTMLVideoElement | null = null;
  texture: THREE.VideoTexture | null = null;
  private stream: MediaStream | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private cctx: CanvasRenderingContext2D | null = null;
  private prev: Uint8ClampedArray | null = null;
  private raf = 0;
  motionToForce = 1;

  get isRunning() {
    return !!this.stream;
  }

  async start() {
    if (this.stream) return; // already running
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: "user" },
      audio: false,
    });
    const v = document.createElement("video");
    v.srcObject = this.stream;
    v.muted = true;
    v.playsInline = true;
    await v.play();
    this.video = v;

    const tex = new THREE.VideoTexture(v);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    this.texture = tex;

    this.canvas = document.createElement("canvas");
    this.canvas.width = SAMPLE;
    this.canvas.height = SAMPLE;
    this.cctx = this.canvas.getContext("2d", { willReadFrequently: true });

    signals.camTexture = tex;
    signals.camActive = true;
    this.loop();
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.texture?.dispose();
    this.texture = null;
    this.video = null;
    this.prev = null;
    signals.camTexture = null;
    signals.camActive = false;
    signals.camMotion = 0;
    signals.camBrightness = 0;
  }

  private loop = () => {
    if (this.video && this.cctx && this.video.readyState >= 2) {
      // Mirror so movement feels direct.
      this.cctx.save();
      this.cctx.scale(-1, 1);
      this.cctx.drawImage(this.video, -SAMPLE, 0, SAMPLE, SAMPLE);
      this.cctx.restore();

      const frame = this.cctx.getImageData(0, 0, SAMPLE, SAMPLE).data;
      let motion = 0;
      let bright = 0;
      if (this.prev) {
        for (let i = 0; i < frame.length; i += 4) {
          const lum = (frame[i] + frame[i + 1] + frame[i + 2]) / 3;
          const plum = (this.prev[i] + this.prev[i + 1] + this.prev[i + 2]) / 3;
          motion += Math.abs(lum - plum);
          bright += lum;
        }
        const px = frame.length / 4;
        motion = motion / px / 255; // 0..1 (typically small)
        bright = bright / px / 255;
      }
      this.prev = frame.slice();

      signals.camMotion = smooth(
        signals.camMotion,
        Math.min(1, motion * 6 * this.motionToForce),
        0.3
      );
      signals.camBrightness = smooth(signals.camBrightness, bright, 0.2);
    }
    this.raf = requestAnimationFrame(this.loop);
  };
}

let engine: WebcamEngine | null = null;
export function getWebcamEngine(): WebcamEngine {
  if (!engine) engine = new WebcamEngine();
  return engine;
}
