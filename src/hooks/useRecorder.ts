import { useCallback, useRef } from "react";
import { useStore } from "@/store/useStore";

// Captures the WebGL canvas: still frames (PNG/JPG) and video (WebM via
// MediaRecorder). MP4 is offered when the browser advertises an mp4 codec,
// otherwise we fall back to WebM (the common case on Chrome/Firefox).

function getCanvas(): HTMLCanvasElement | null {
  return document.querySelector("canvas");
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

function pickVideoMime(): string {
  const candidates = [
    "video/mp4;codecs=avc1",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c))
      return c;
  }
  return "video/webm";
}

export function useRecorder() {
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const snapshot = useCallback((type: "png" | "jpg" = "png") => {
    const canvas = getCanvas();
    if (!canvas) return;
    const mime = type === "png" ? "image/png" : "image/jpeg";
    // requestAnimationFrame ensures we read a freshly-rendered frame.
    requestAnimationFrame(() => {
      canvas.toBlob(
        (blob) => {
          if (blob) download(blob, `visualset-${stamp()}.${type}`);
          useStore.getState().flash(`Saved ${type.toUpperCase()}`);
        },
        mime,
        0.95
      );
    });
  }, []);

  const startRecording = useCallback(() => {
    const canvas = getCanvas();
    if (!canvas || recorder.current) return;
    const stream = canvas.captureStream(60);
    const mimeType = pickVideoMime();
    const rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 12_000_000 });
    chunks.current = [];
    rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    rec.onstop = () => {
      const blob = new Blob(chunks.current, { type: mimeType });
      const ext = mimeType.includes("mp4") ? "mp4" : "webm";
      download(blob, `visualset-${stamp()}.${ext}`);
      useStore.getState().setRecording(false);
      useStore.getState().flash(`Saved ${ext.toUpperCase()}`);
    };
    rec.start();
    recorder.current = rec;
    useStore.getState().setRecording(true);
    useStore.getState().flash("● Recording");
  }, []);

  const stopRecording = useCallback(() => {
    recorder.current?.stop();
    recorder.current = null;
  }, []);

  const toggleRecording = useCallback(() => {
    if (recorder.current) stopRecording();
    else startRecording();
  }, [startRecording, stopRecording]);

  return { snapshot, startRecording, stopRecording, toggleRecording };
}
