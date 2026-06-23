import { signals, smooth } from "@/lib/signals";

// Real-time audio analysis -> normalised bass / mid / treble / rms + beat detection.
// Writes straight into the shared `signals` bus on its own rAF loop.

export class AudioEngine {
  ctx: AudioContext | null = null;
  analyser: AnalyserNode | null = null;
  private freq: Uint8Array<ArrayBuffer> = new Uint8Array(new ArrayBuffer(0));
  private time: Uint8Array<ArrayBuffer> = new Uint8Array(new ArrayBuffer(0));
  private source: AudioNode | null = null;
  private stream: MediaStream | null = null;
  audioEl: HTMLAudioElement | null = null;
  private raf = 0;

  // beat detection state
  private energyHistory: number[] = [];
  private beatCooldown = 0;

  // gains (set from store mapping)
  reactivity = 1;
  bassGain = 1;
  midGain = 1;
  trebleGain = 1;

  // playback timeline (file source) — used by the Lyrics Engine to sync words
  get playTime() {
    return this.audioEl?.currentTime ?? 0;
  }
  get playDuration() {
    const d = this.audioEl?.duration;
    return d && isFinite(d) ? d : 0;
  }
  get hasTimeline() {
    return !!this.audioEl && !!this.audioEl.src;
  }

  private ensureCtx() {
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new AC();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.78;
      this.freq = new Uint8Array(this.analyser.frequencyBinCount);
      this.time = new Uint8Array(this.analyser.fftSize);
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
  }

  private connect(node: AudioNode, toDestination: boolean) {
    this.disconnectSource();
    this.source = node;
    node.connect(this.analyser!);
    if (toDestination) this.analyser!.connect(this.ctx!.destination);
    this.loop();
  }

  private disconnectSource() {
    try {
      this.source?.disconnect();
      this.analyser?.disconnect();
    } catch {
      /* noop */
    }
  }

  async startMic() {
    this.ensureCtx();
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
    const src = this.ctx!.createMediaStreamSource(this.stream);
    // Do NOT route mic to destination (feedback howl).
    this.connect(src, false);
    signals.audioActive = true;
  }

  async loadFile(file: File) {
    this.ensureCtx();
    if (!this.audioEl) {
      this.audioEl = new Audio();
      this.audioEl.crossOrigin = "anonymous";
      this.audioEl.loop = true;
    }
    this.audioEl.src = URL.createObjectURL(file);
    const src = this.ctx!.createMediaElementSource(this.audioEl);
    this.connect(src, true);
    await this.audioEl.play();
    signals.audioActive = true;
  }

  togglePlay() {
    if (!this.audioEl) return;
    if (this.audioEl.paused) this.audioEl.play();
    else this.audioEl.pause();
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.disconnectSource();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.src = "";
    }
    signals.audioActive = false;
    signals.bass = signals.mid = signals.treble = signals.rms = signals.beat = 0;
  }

  private bandAvg(data: Uint8Array, lo: number, hi: number) {
    let sum = 0;
    for (let i = lo; i < hi; i++) sum += data[i];
    return sum / (hi - lo) / 255;
  }

  private loop = () => {
    if (!this.analyser) return;
    this.analyser.getByteFrequencyData(this.freq);
    this.analyser.getByteTimeDomainData(this.time);

    const bins = this.freq.length; // 1024
    // Roughly: bass 0-6%, mid 6-25%, treble 25-65%.
    const bass = this.bandAvg(this.freq, 0, Math.floor(bins * 0.06));
    const mid = this.bandAvg(this.freq, Math.floor(bins * 0.06), Math.floor(bins * 0.25));
    const treble = this.bandAvg(this.freq, Math.floor(bins * 0.25), Math.floor(bins * 0.65));

    // RMS from time-domain (loudness).
    let sumSq = 0;
    for (let i = 0; i < this.time.length; i++) {
      const v = (this.time[i] - 128) / 128;
      sumSq += v * v;
    }
    const rms = Math.sqrt(sumSq / this.time.length);

    const r = this.reactivity;
    signals.bass = smooth(signals.bass, Math.min(1, bass * this.bassGain * r), 0.35);
    signals.mid = smooth(signals.mid, Math.min(1, mid * this.midGain * r), 0.35);
    signals.treble = smooth(signals.treble, Math.min(1, treble * this.trebleGain * r), 0.4);
    signals.rms = smooth(signals.rms, Math.min(1, rms * 1.6 * r), 0.3);

    // --- beat detection: compare instantaneous bass energy to local average ---
    const instant = bass;
    this.energyHistory.push(instant);
    if (this.energyHistory.length > 43) this.energyHistory.shift();
    const avg =
      this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
    this.beatCooldown -= 1;
    if (instant > avg * 1.35 && instant > 0.18 && this.beatCooldown <= 0) {
      signals.beat = 1;
      this.beatCooldown = 8; // ~130ms min between beats at 60fps
    } else {
      signals.beat = smooth(signals.beat, 0, 0.12);
    }

    this.raf = requestAnimationFrame(this.loop);
  };
}

let engine: AudioEngine | null = null;
export function getAudioEngine(): AudioEngine {
  if (!engine) engine = new AudioEngine();
  return engine;
}
