/**
 * Lower-cases, strips accents and Arabic marks, and collapses everything
 * that is not a letter or digit, so "Al Hidd", "al-hidd" and "الحد" compare
 * the way a person would expect. The search, the area filter and the home
 * page's area chips all use this one function, so their counts agree.
 */
export function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .toLocaleLowerCase("en")
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[’'`]/g, "")
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
