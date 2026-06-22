// Deterministic, seedable randomness so any visual can be reproduced from a short string.

/** Mulberry32 — tiny, fast, good-enough PRNG. Returns floats in [0,1). */
export function mulberry32(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash an arbitrary string into a 32-bit int (xfnv1a). */
export function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A new human-shareable seed, e.g. "v7k2p9qm". */
export function generateSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** A small toolbox of seeded helpers built on top of one PRNG. */
export class Rng {
  private r: () => number;
  constructor(seed: string | number) {
    const n = typeof seed === "number" ? seed : hashString(seed);
    this.r = mulberry32(n);
  }
  next() {
    return this.r();
  }
  range(min: number, max: number) {
    return min + (max - min) * this.r();
  }
  int(min: number, max: number) {
    return Math.floor(this.range(min, max + 1));
  }
  bool(p = 0.5) {
    return this.r() < p;
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.r() * arr.length)];
  }
  /** Weighted gaussian-ish value biased toward the centre — keeps params "tasteful". */
  curve(min: number, max: number, bias = 2) {
    let acc = 0;
    for (let i = 0; i < bias; i++) acc += this.r();
    return min + (max - min) * (acc / bias);
  }
}
