// Klient DeepL (darmowy tier) z ochroną treści specyficznej dla gry.
//
// DeepL sam przetłumaczyłby nazwy dino i potrafi ruszyć markdown. Używamy trybu
// `tag_handling=xml` + `ignore_tags=keep`: prozę tłumaczymy, a wszystko owinięte
// w <keep>…</keep> (bloki kodu, numery wersji, nazwy własne) zostaje 1:1.
// Logika maskowania jest czysta i przetestowana — sam HTTP jest cienki.

const DEEPL_URL = "https://api-free.deepl.com/v2/translate";

/** Nazwy własne, których NIE tłumaczymy (gatunki The Isle + terminy gry). */
const PROPER_NOUNS = [
  "Tyrannosaurus",
  "Carnotaurus",
  "Ceratosaurus",
  "Allosaurus",
  "Suchomimus",
  "Spinosaurus",
  "Herrerasaurus",
  "Austroraptor",
  "Utahraptor",
  "Deinosuchus",
  "Beipiaosaurus",
  "Beipi",
  "Pteranodon",
  "Dilophosaurus",
  "Omniraptor",
  "Troodon",
  "Gallimimus",
  "Pachycephalosaurus",
  "Pachy",
  "Maiasaura",
  "Tenontosaurus",
  "Diabloceratops",
  "Dryosaurus",
  "Hypsilophodon",
  "Stegosaurus",
  "Kentrosaurus",
  "Triceratops",
  "Therizinosaurus",
  "Hordetesting",
  "Steam",
  "Islanders",
].sort((a, b) => b.length - a.length); // dłuższe najpierw (zapas, \b i tak chroni)

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Kolejność alternacji ma znaczenie: blok kodu (najdłuższy) → inline code →
// numer wersji → nazwy własne. Global, by złapać wszystkie wystąpienia.
const PROTECT_RE = new RegExp(
  [
    "```[\\s\\S]*?```", // fenced code
    "`[^`]+`", // inline code
    "\\b\\d+\\.\\d+(?:\\.\\d+)?\\b", // numery wersji (0.21.659)
    `\\b(?:${PROPER_NOUNS.map(escapeRegex).join("|")})\\b`,
  ].join("|"),
  "gi",
);

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function unescapeXml(s: string): string {
  return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

/**
 * Przygotowuje tekst dla DeepL (tag_handling=xml): escapuje znaki XML i owija
 * fragmenty nietykalne w <keep>…</keep>. Eksportowane do testów round-tripu.
 */
export function maskForDeepl(text: string): string {
  return escapeXml(text).replace(PROTECT_RE, (m) => `<keep>${m}</keep>`);
}

/** Odwrotność {@link maskForDeepl}: zdejmuje tagi keep i odescapowuje XML. */
export function unmaskFromDeepl(text: string): string {
  return unescapeXml(text.replace(/<\/?keep>/g, ""));
}

/**
 * Tłumaczy tekst na `targetLang` (kod DeepL) z ochroną nazw/kodu/wersji. Zwraca
 * `null`, gdy brak klucza lub DeepL zawiedzie (best-effort — handler to pomija).
 */
export async function translate(
  text: string,
  targetLang: string,
): Promise<string | null> {
  const key = process.env.DEEPL_API_KEY;
  if (!key) return null;

  const body = new URLSearchParams({
    text: maskForDeepl(text),
    target_lang: targetLang,
    tag_handling: "xml",
    ignore_tags: "keep",
    outline_detection: "0",
  });

  const res = await fetch(DEEPL_URL, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  }).catch(() => null);

  if (!res || !res.ok) {
    console.error(`[translation] DeepL HTTP ${res?.status ?? "network error"}`);
    return null;
  }

  const data = (await res.json().catch(() => null)) as {
    translations?: { text: string }[];
  } | null;
  const out = data?.translations?.[0]?.text;
  return out ? unmaskFromDeepl(out) : null;
}
