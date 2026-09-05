import { describe, expect, it } from "vitest";

import { inferBadgeFamilies, normalizeBadgeName } from "./badgeNameAffinity";

describe("literal badge name affinity", () => {
  const names = [
    "Git入門",
    "git演習",
    "GitHub入門",
    "Unity講習会",
    "真Unity講習会",
    "機械学習入門",
    "機械学習応用",
    "Python入門",
  ];
  it("matches literal shared terms without treating generic lecture words as a family", () => {
    const result = inferBadgeFamilies(names);
    expect(result.get("git入門")).toBe("git");
    expect(result.get("git演習")).toBe("git");
    expect(result.has("github入門")).toBe(false);
    expect(result.get("unity講習会")).toBe("unity");
    expect(result.get("真unity講習会")).toBe("unity");
    expect(result.get("機械学習入門")).toBe("機械学習");
    expect(result.get("機械学習応用")).toBe("機械学習");
    expect(result.has("python入門")).toBe(false);
    expect(inferBadgeFamilies(["入門講習会", "応用講習会", ""]).size).toBe(0);
  });
  it("normalizes names and ignores annual duplicates and catalog ordering", () => {
    const expected = inferBadgeFamilies(names);
    const result = inferBadgeFamilies([...names].reverse().concat(["Ｇｉｔ入門", "Unity講習会"]));
    for (const name of names)
      expect(result.get(normalizeBadgeName(name))).toBe(expected.get(normalizeBadgeName(name)));
    expect(inferBadgeFamilies(["Git講習会", "Git講習会"]).size).toBe(0);
  });
  it("bounds long-name token enumeration", () => {
    expect(inferBadgeFamilies(["あ".repeat(10000), "あ".repeat(10000) + "い"]).size).toBe(2);
  });
});
