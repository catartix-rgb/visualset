// Curated palettes. Randomization picks from these instead of raw RGB so results
// always feel art-directed rather than noisy. Colors are linear-ish sRGB triplets 0..1.

export type RGB = [number, number, number];
export type Palette = { name: string; colors: RGB[] };

function hex(h: string): RGB {
  const n = parseInt(h.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export const PALETTES: Palette[] = [
  { name: "Aurora", colors: ["#02111b", "#0b3d4f", "#19c2a0", "#9bf6d6", "#e9fff7"].map(hex) },
  { name: "Plasma", colors: ["#0d0221", "#451a78", "#b5179e", "#ff5d8f", "#ffd6e0"].map(hex) },
  { name: "Ember", colors: ["#0a0500", "#3d1500", "#b5390a", "#ff8c1a", "#ffe3a3"].map(hex) },
  { name: "Cyanic", colors: ["#001219", "#005f73", "#0a9396", "#94d2bd", "#e9f5db"].map(hex) },
  { name: "Vapor", colors: ["#14002b", "#5a189a", "#9d4edd", "#ff6ec7", "#caffbf"].map(hex) },
  { name: "Mono Ice", colors: ["#04070d", "#1b2a3a", "#3e6890", "#9ec1e0", "#f2f8ff"].map(hex) },
  { name: "Solaris", colors: ["#0b0a07", "#3a2d0f", "#caa023", "#ffd60a", "#fff4cc"].map(hex) },
  { name: "Magma", colors: ["#03071e", "#370617", "#9d0208", "#e85d04", "#ffba08"].map(hex) },
  { name: "Verdant", colors: ["#011401", "#1a3a13", "#52b788", "#b7e4c7", "#f1fff4"].map(hex) },
  { name: "Ultraviolet", colors: ["#10002b", "#3c096c", "#7b2cbf", "#c77dff", "#e0aaff"].map(hex) },
  { name: "Coral Reef", colors: ["#012a36", "#0c7489", "#13505b", "#ff785a", "#ffd9c0"].map(hex) },
  { name: "Inferno Glass", colors: ["#000000", "#2b0a3d", "#841e62", "#f9a620", "#fefae0"].map(hex) },
  { name: "Glacier", colors: ["#02131f", "#073b4c", "#118ab2", "#83c5be", "#edf6f9"].map(hex) },
  { name: "Neon Tokyo", colors: ["#0a0014", "#240046", "#ff006e", "#3a86ff", "#8338ec"].map(hex) },
  { name: "Sandstorm", colors: ["#1a1300", "#5c4d1e", "#bfa14a", "#e8c87a", "#fff3d6"].map(hex) },
];

export function paletteByName(name: string): Palette {
  return PALETTES.find((p) => p.name === name) ?? PALETTES[0];
}
