const KANJI_READINGS: Array<[RegExp, string]> = [
  [/講習会/gu, "こうしゅうかい"],
  [/講座/gu, "こうざ"],
  [/担当/gu, "たんとう"],
  [/運営/gu, "うんえい"],
  [/新入生/gu, "しんにゅうせい"],
  [/年度/gu, "ねんど"],
  [/班/gu, "はん"],
];

const KANA_DIGRAPHS: Record<string, string> = {
  きゃ: "kya", きゅ: "kyu", きょ: "kyo",
  ぎゃ: "gya", ぎゅ: "gyu", ぎょ: "gyo",
  しゃ: "sya", しゅ: "syu", しょ: "syo",
  じゃ: "zya", じゅ: "zyu", じょ: "zyo",
  ちゃ: "tya", ちゅ: "tyu", ちょ: "tyo",
  にゃ: "nya", にゅ: "nyu", にょ: "nyo",
  ひゃ: "hya", ひゅ: "hyu", ひょ: "hyo",
  びゃ: "bya", びゅ: "byu", びょ: "byo",
  ぴゃ: "pya", ぴゅ: "pyu", ぴょ: "pyo",
  みゃ: "mya", みゅ: "myu", みょ: "myo",
  りゃ: "rya", りゅ: "ryu", りょ: "ryo",
  ふぁ: "fa", ふぃ: "fi", ふぇ: "fe", ふぉ: "fo",
  てぃ: "ti", でぃ: "di", うぃ: "wi", うぇ: "we", うぉ: "wo",
};

const KANA: Record<string, string> = {
  あ: "a", い: "i", う: "u", え: "e", お: "o",
  か: "ka", き: "ki", く: "ku", け: "ke", こ: "ko",
  が: "ga", ぎ: "gi", ぐ: "gu", げ: "ge", ご: "go",
  さ: "sa", し: "si", す: "su", せ: "se", そ: "so",
  ざ: "za", じ: "zi", ず: "zu", ぜ: "ze", ぞ: "zo",
  た: "ta", ち: "ti", つ: "tu", て: "te", と: "to",
  だ: "da", ぢ: "zi", づ: "zu", で: "de", ど: "do",
  な: "na", に: "ni", ぬ: "nu", ね: "ne", の: "no",
  は: "ha", ひ: "hi", ふ: "hu", へ: "he", ほ: "ho",
  ば: "ba", び: "bi", ぶ: "bu", べ: "be", ぼ: "bo",
  ぱ: "pa", ぴ: "pi", ぷ: "pu", ぺ: "pe", ぽ: "po",
  ま: "ma", み: "mi", む: "mu", め: "me", も: "mo",
  や: "ya", ゆ: "yu", よ: "yo",
  ら: "ra", り: "ri", る: "ru", れ: "re", ろ: "ro",
  わ: "wa", を: "wo", ん: "n", ゔ: "vu", ー: "",
};

function katakanaToHiragana(value: string) {
  return Array.from(value, (character) => {
    const code = character.charCodeAt(0);
    return code >= 0x30a1 && code <= 0x30f6
      ? String.fromCharCode(code - 0x60)
      : character;
  }).join("");
}

function kanaToRomaji(value: string) {
  let result = "";
  for (let index = 0; index < value.length;) {
    const pair = value.slice(index, index + 2);
    if (KANA_DIGRAPHS[pair]) {
      result += KANA_DIGRAPHS[pair];
      index += 2;
      continue;
    }

    const character = value[index];
    if (character === "っ") {
      const nextPair = KANA_DIGRAPHS[value.slice(index + 1, index + 3)];
      const next = nextPair ?? KANA[value[index + 1]] ?? "";
      result += next[0] ?? "";
      index += 1;
      continue;
    }

    result += KANA[character] ?? character;
    index += 1;
  }
  return result;
}

export function normalizeSearchText(value: string) {
  let normalized = value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/lecture/gu, "kousyuukai")
    .replace(/workshop/gu, "kousyuukai");
  for (const [pattern, reading] of KANJI_READINGS) normalized = normalized.replace(pattern, reading);
  return kanaToRomaji(katakanaToHiragana(normalized))
    .replace(/shi/gu, "si")
    .replace(/shu/gu, "syu")
    .replace(/sho/gu, "syo")
    .replace(/chi/gu, "ti")
    .replace(/tsu/gu, "tu")
    .replace(/[^a-z0-9]/gu, "");
}

function subsequenceScore(value: string, query: string) {
  let valueIndex = 0;
  let queryIndex = 0;
  let gaps = 0;
  while (valueIndex < value.length && queryIndex < query.length) {
    if (value[valueIndex] === query[queryIndex]) queryIndex += 1;
    else if (queryIndex > 0) gaps += 1;
    valueIndex += 1;
  }
  return queryIndex === query.length ? Math.max(1, 240 - gaps) : -1;
}

export function searchTextScore(fields: string[], query: string) {
  const needle = normalizeSearchText(query.replace(/^@/u, ""));
  if (!needle) return -1;
  const normalizedFields = fields.map(normalizeSearchText).filter(Boolean);
  if (normalizedFields.some((field) => field === needle)) return 1000;
  if (normalizedFields.some((field) => field.startsWith(needle))) return 800;
  if (normalizedFields.some((field) => field.includes(needle))) return 600;

  const combined = normalizedFields.join("");
  if (combined.includes(needle)) return 500;
  return subsequenceScore(combined, needle);
}
