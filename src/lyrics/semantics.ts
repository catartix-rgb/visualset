import type { LyricIntent } from "./types";
import { NEUTRAL_INTENT } from "./types";
import type { LyricLine } from "./types";

// Artistic (not literal) interpretation of lyrics. A compact multilingual lexicon maps
// evocative words to a THEME, and each theme carries a visual intent: a palette to bias
// toward, a motion behaviour for the typography, plus warmth/energy. Matching is fuzzy
// (substring) so conjugations and CJK words still hit.

interface Theme {
  theme: string;
  palette: string | null;
  motion: LyricIntent["motion"];
  warmth: number;
  energy: number;
  words: string[];
}

const THEMES: Theme[] = [
  { theme: "water", palette: "Glacier", motion: "wave", warmth: -0.6, energy: 0.5,
    words: ["water","ocean","sea","rain","river","wave","tears","agua","mar","lluvia","lagrima","ola","eau","mer","pluie","wasser","regen","meer","agua","chuva","mare","pioggia","vatten","hav","regn","水","海","雨","물","비","바다"] },
  { theme: "fire", palette: "Magma", motion: "flicker", warmth: 0.9, energy: 0.85,
    words: ["fire","flame","burn","heat","spark","ash","fuego","llama","arder","quemar","feu","flamme","bruler","feuer","flamme","brennen","fogo","chama","fuoco","fiamma","eld","brinna","火","炎","불"] },
  { theme: "fall", palette: null, motion: "down", warmth: -0.1, energy: 0.55,
    words: ["fall","falling","drop","down","sink","cae","caer","caigo","tomber","chute","fallen","sinken","cair","queda","cadere","giu","falla","ner","落"] },
  { theme: "fly", palette: "Aurora", motion: "up", warmth: 0.1, energy: 0.7,
    words: ["fly","flying","rise","up","wings","soar","sky","vuela","volar","cielo","alas","voler","ciel","ailes","fliegen","himmel","voar","ceu","volare","cielo","flyga","himmel","空","飛","하늘","날"] },
  { theme: "night", palette: "Ultraviolet", motion: "dim", warmth: -0.3, energy: 0.3,
    words: ["night","dark","shadow","moon","sleep","noche","oscuro","sombra","luna","nuit","sombre","lune","nacht","dunkel","mond","noite","escuro","notte","buio","luna","natt","morker","夜","闇","月","밤","어둠"] },
  { theme: "love", palette: "Coral Reef", motion: "soft", warmth: 0.6, energy: 0.4,
    words: ["love","heart","kiss","amor","corazon","beso","amour","coeur","liebe","herz","kuss","amor","coracao","amore","cuore","karlek","hjarta","愛","恋","心","사랑","마음"] },
  { theme: "light", palette: "Solaris", motion: "burst", warmth: 0.7, energy: 0.75,
    words: ["light","shine","sun","glow","bright","gold","luz","sol","brillo","lumiere","soleil","licht","sonne","luz","sol","luce","sole","ljus","sol","光","太陽","빛","해"] },
  { theme: "cold", palette: "Mono Ice", motion: "none", warmth: -0.8, energy: 0.3,
    words: ["cold","ice","frozen","winter","snow","frio","hielo","nieve","froid","glace","neige","kalt","eis","schnee","frio","gelo","neve","freddo","ghiaccio","kall","is","sno","冷","氷","雪","추","눈"] },
  { theme: "dream", palette: "Vapor", motion: "soft", warmth: 0.2, energy: 0.4,
    words: ["dream","sleep","fade","memory","sueno","sonar","recuerdo","reve","traum","sonho","sogno","drom","夢","꿈"] },
  { theme: "dance", palette: "Neon Tokyo", motion: "burst", warmth: 0.4, energy: 0.95,
    words: ["dance","move","beat","jump","baila","bailar","danse","tanzen","danca","danza","dansa","踊","춤"] },
];

const STOP = new Set([
  "the","and","you","that","for","with","this","have","your","are","not","but","all","como","que","los","las","una","con","por","para","del","mais","nao","und","der","die","das","ich","les","des","une",
]);

function norm(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Interpret a single line into an artistic intent. */
export function analyzeLine(text: string): LyricIntent {
  const t = norm(text);
  let best: Theme | null = null;
  let bestScore = 0;
  for (const th of THEMES) {
    let score = 0;
    for (const w of th.words) if (w.length > 1 && t.indexOf(w) >= 0) score++;
    if (score > bestScore) {
      bestScore = score;
      best = th;
    }
  }
  if (!best) return { ...NEUTRAL_INTENT };
  return {
    theme: best.theme,
    palette: best.palette,
    motion: best.motion,
    warmth: best.warmth,
    energy: best.energy,
  };
}

/** Frequency of meaningful words across the whole lyric (for the dynamic word cloud). */
export function buildWordCloud(lines: LyricLine[], limit = 14): { w: string; n: number }[] {
  const counts = new Map<string, number>();
  for (const l of lines) {
    const seen = norm(l.text).split(/[^\p{L}]+/u).filter((w) => w.length >= 4 && !STOP.has(w));
    for (const w of seen) counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([w, n]) => ({ w, n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, limit);
}
