import type { ImageSegmenter as ImageSegmenterT } from "@mediapipe/tasks-vision";
import * as THREE from "three";
import { signals } from "@/lib/signals";
import { getWebcamEngine } from "./WebcamEngine";

// Person segmentation via MediaPipe Selfie Segmenter. Produces a per-pixel person
// mask (1 = person, 0 = background) exposed as a texture, so the Silhouette Halftone
// can build a graphic figure from the body alone and discard the room/background.

const WASM_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite";

export class SegmentationEngine {
  private segmenter: ImageSegmenterT | null = null;
  private raf = 0;
  private lastVideoTime = -1;
  loading = false;
  failed = false;

  maskTexture: THREE.DataTexture | null = null;
  private maskData: Uint8Array = new Uint8Array(0);
  private w = 0;
  private h = 0;

  async start() {
    const cam = getWebcamEngine();
    if (!cam.isRunning) await cam.start();

    if (!this.segmenter) {
      this.loading = true;
      try {
        const { ImageSegmenter, FilesetResolver } = await import("@mediapipe/tasks-vision");
        const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
        this.segmenter = await ImageSegmenter.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          outputCategoryMask: false,
          outputConfidenceMasks: true,
        });
      } catch (e) {
        console.error("Segmentation init failed", e);
        this.failed = true;
      }
      this.loading = false;
    }
    if (this.segmenter) this.loop();
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.maskTexture?.dispose();
    this.maskTexture = null;
    signals.maskTexture = null;
  }

  private ensureTexture(w: number, h: number) {
    if (this.w === w && this.h === h && this.maskTexture) return;
    this.w = w;
    this.h = h;
    this.maskData = new Uint8Array(w * h * 4);
    for (let i = 3; i < this.maskData.length; i += 4) this.maskData[i] = 255;
    const tex = new THREE.DataTexture(this.maskData, w, h, THREE.RGBAFormat);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    this.maskTexture = tex;
    signals.maskTexture = tex;
  }

  private loop = () => {
    const cam = getWebcamEngine();
    const video = cam.video;
    if (this.segmenter && video && video.readyState >= 2 && video.currentTime !== this.lastVideoTime) {
      this.lastVideoTime = video.currentTime;
      try {
        this.segmenter.segmentForVideo(video, performance.now(), (result) => {
          const mask = result.confidenceMasks?.[0];
          if (!mask) return;
          const w = mask.width;
          const h = mask.height;
          const arr = mask.getAsFloat32Array();
          this.ensureTexture(w, h);
          const data = this.maskData;
          // flip vertically so it matches the (flipY) camera texture orientation
          for (let y = 0; y < h; y++) {
            const srcRow = y * w;
            const dstRow = (h - 1 - y) * w;
            for (let x = 0; x < w; x++) {
              const v = Math.min(255, arr[srcRow + x] * 255) | 0;
              const di = (dstRow + x) * 4;
              data[di] = data[di + 1] = data[di + 2] = v;
            }
          }
          if (this.maskTexture) this.maskTexture.needsUpdate = true;
        });
      } catch {
        /* transient frame error — ignore */
      }
    }
    this.raf = requestAnimationFrame(this.loop);
  };
}

let engine: SegmentationEngine | null = null;
export function getSegmentationEngine(): SegmentationEngine {
  if (!engine) engine = new SegmentationEngine();
  return engine;
}
