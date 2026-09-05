// A visual hint from literal shared words, not a persisted domain classification.
// Use a common published catalog, never the set of badges earned by a particular user.
export function normalizeBadgeName(name: string): string {
  return name.normalize("NFKC").toLowerCase().trim();
}

function tokens(name: string): Set<string> {
  const clean = normalizeBadgeName(name)
    .slice(0, 200)
    .replace(/\[[^\]]*\]/g, "")
    .replace(/講習会|講座|入門|基礎|応用|実践|演習|比較用/g, " ");
  const result = new Set(clean.match(/[a-z][a-z0-9+#]*/g) ?? []);
  for (const run of clean.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー]+/gu) ??
    []) {
    // Bound substring enumeration; the preview's unbounded quadratic token set is not needed here.
    for (let length = 3; length <= Math.min(12, run.length); length++) {
      for (let start = 0; start + length <= run.length; start++) {
        result.add(run.slice(start, start + length));
      }
    }
  }
  return result;
}

export function inferBadgeFamilies(names: readonly string[]): Map<string, string> {
  // Annual copies of the same name must not turn the entire name into a new shared keyword.
  const uniqueNames = [...new Set(names.map(normalizeBadgeName))];
  const sets = uniqueNames.map(tokens);
  const counts = new Map<string, number>();
  for (const set of sets) for (const word of set) counts.set(word, (counts.get(word) ?? 0) + 1);
  const families = new Map<string, string>();
  for (const [index, name] of uniqueNames.entries()) {
    const shared = [...(sets[index] ?? [])]
      .filter((word) => (counts.get(word) ?? 0) > 1)
      .sort(
        (a, b) =>
          b.length - a.length ||
          (counts.get(b) ?? 0) - (counts.get(a) ?? 0) ||
          (a < b ? -1 : a > b ? 1 : 0),
      );
    if (shared[0]) families.set(name, shared[0]);
  }
  return families;
}
