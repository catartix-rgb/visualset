import type { Preset, VisualState } from "@/lib/types";
import { useStore } from "@/store/useStore";

const LS_KEY = "visualset.presets.v1";

export function listPresets(): Preset[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function savePreset(name?: string): Preset {
  const preset = useStore.getState().exportPreset(name);
  const all = listPresets();
  all.unshift(preset);
  localStorage.setItem(LS_KEY, JSON.stringify(all.slice(0, 50)));
  useStore.getState().flash(`Saved preset "${preset.name}"`);
  return preset;
}

export function deletePreset(createdAt: number) {
  const all = listPresets().filter((p) => p.createdAt !== createdAt);
  localStorage.setItem(LS_KEY, JSON.stringify(all));
}

export function applyPreset(p: VisualState) {
  useStore.getState().loadState(p);
  useStore.getState().flash("Preset loaded");
}

export function exportPresetFile(name?: string) {
  const preset = useStore.getState().exportPreset(name);
  const blob = new Blob([JSON.stringify(preset, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${preset.name.replace(/\s+/g, "-").toLowerCase()}.visualset.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function importPresetFile(file: File) {
  try {
    const text = await file.text();
    const data = JSON.parse(text) as Preset;
    if (!data.sceneId || !data.params) throw new Error("Invalid preset file");
    applyPreset(data);
  } catch (e) {
    console.error(e);
    useStore.getState().flash("Invalid preset file");
  }
}
