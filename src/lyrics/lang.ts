// Lightweight, dependency-free language detection covering the requested languages.
// Script ranges catch Japanese/Korean instantly; Latin languages are scored by their
// most common function words (stopwords). Good enough to label and route the lexicon.

const STOPWORDS: Record<string, string[]> = {
  Spanish: ["que", "de", "no", "la", "el", "y", "en", "es", "por", "con", "mi", "tu", "yo", "amor", "como", "para"],
  English: ["the", "and", "you", "to", "of", "in", "it", "is", "my", "me", "we", "are", "for", "i", "love", "your"],
  French: ["le", "la", "les", "et", "de", "je", "tu", "un", "une", "que", "pas", "pour", "avec", "mon", "amour"],
  German: ["und", "der", "die", "das", "ich", "du", "nicht", "ist", "ein", "eine", "mit", "wir", "auf", "liebe"],
  Portuguese: ["que", "de", "nao", "eu", "voce", "um", "uma", "com", "para", "meu", "amor", "como", "mais"],
  Italian: ["che", "di", "non", "il", "la", "io", "tu", "un", "una", "per", "con", "mio", "amore", "come", "sono"],
  Swedish: ["och", "att", "jag", "det", "som", "en", "ett", "inte", "du", "vi", "med", "kärlek", "är", "för"],
};

const NAME_TO_CODE: Record<string, string> = {
  Spanish: "es", English: "en", French: "fr", German: "de",
  Portuguese: "pt", Italian: "it", Swedish: "sv", Japanese: "ja", Korean: "ko",
};

export interface DetectedLang {
  name: string;
  code: string;
}

export function detectLanguage(text: string): DetectedLang {
  if (!text.trim()) return { name: "Unknown", code: "" };

  if (/[가-힯]/.test(text)) return { name: "Korean", code: "ko" };
  if (/[぀-ヿ]/.test(text)) return { name: "Japanese", code: "ja" };
  // CJK ideographs without kana — treat as Japanese here (the app's supported set)
  if (/[一-龯]/.test(text)) return { name: "Japanese", code: "ja" };

  const words = text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/[^a-z]+/).filter(Boolean);
  let best = "English";
  let bestScore = -1;
  for (const [name, list] of Object.entries(STOPWORDS)) {
    const set = new Set(list);
    let score = 0;
    for (const w of words) if (set.has(w)) score++;
    if (score > bestScore) {
      bestScore = score;
      best = name;
    }
  }
  return { name: best, code: NAME_TO_CODE[best] };
}
