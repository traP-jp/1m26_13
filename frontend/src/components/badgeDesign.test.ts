import { describe, expect, it } from "vitest";

import { badgeHostColor, buildLectureBadge } from "./badgeDesign";

const input = { lectureName: "Git講習会", hostGroupNames: ["SysAd"], instanceId: "tile" };

describe("host-frame badge design", () => {
  it("keeps deterministic appearance for the same lecture, independently of instance IDs", () => {
    expect(buildLectureBadge(input).svg).toBe(
      buildLectureBadge({ ...input, instanceId: "detail" }).svg,
    );
    expect(buildLectureBadge(input).svg).not.toBe(
      buildLectureBadge({ ...input, lectureName: "別の講習会" }).svg,
    );
  });

  it("retains frame color, geometry and white when switching accents", () => {
    const baseline = buildLectureBadge({ ...input, accent: "none" });
    for (const accent of ["none", "soft", "shifted"] as const) {
      const badge = buildLectureBadge({ ...input, accent });
      expect(badge.outer).toBe(baseline.outer);
      expect(badge.scale).toBe(baseline.scale);
      expect(badge.svg).toContain("#dfe7f0");
      expect(badge.svg).not.toContain("linearGradient");
    }
    expect(buildLectureBadge({ ...input, accent: "soft" }).svg).not.toBe(baseline.svg);
  });

  it("preserves frame clearance for every outer/middle combination encountered", () => {
    const combinations = new Set();
    for (let index = 0; index < 750; index++) {
      const badge = buildLectureBadge({ ...input, lectureName: `講習会-${index}` });
      combinations.add(`${badge.params.outerBezelType}:${badge.params.middleLayerType}`);
      expect(badge.scale * 132).toBeLessThanOrEqual(badge.room - 12 + 1e-9);
      expect(badge.svg).not.toMatch(/NaN|undefined|Infinity/);
    }
    expect(combinations.size).toBe(25);
  });

  it("shares the frame family without forcing the lecture-specific interior to match", () => {
    const a = buildLectureBadge({ ...input, family: "git" });
    const b = buildLectureBadge({ ...input, family: "git", lectureName: "Gitブランチ演習" });
    expect(a.params.outerBezelType).toBe(b.params.outerBezelType);
    expect(a.params.symmetry).toBe(b.params.symmetry);
    expect(a.svg).not.toBe(b.svg);
  });

  it("treats cohosts symmetrically and namespaces clip paths across host counts and instances", () => {
    for (const hostSplit of ["sectors", "alternating"] as const) {
      const a = buildLectureBadge({ ...input, hostGroupNames: ["SysAd", "Game"], hostSplit });
      const reverse = buildLectureBadge({
        ...input,
        hostGroupNames: ["Game", "SysAd", "SysAd班"],
        hostSplit,
      });
      expect(a.svg).toBe(reverse.svg);
      expect(a.svg).toContain("#61c1b8");
      expect(a.svg).toContain("#b38ae8");
      expect(a.svg).not.toContain("hsl(");
    }
    const fixtures = [
      buildLectureBadge({ ...input, hostGroupNames: ["SysAd", "Game"] }),
      buildLectureBadge({ ...input, hostGroupNames: ["SysAd", "Game", "CTF"] }),
      buildLectureBadge({
        ...input,
        hostGroupNames: ["SysAd", "Game", "CTF"],
        instanceId: "detail",
      }),
    ];
    const ids = fixtures.flatMap(({ svg }) =>
      [...svg.matchAll(/<clipPath id="([^"]+)"/g)].map((match) => match[1]),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses exact group aliases, not lecture-name inference, and has a neutral fallback", () => {
    expect(badgeHostColor("SysAd班")).toBe(badgeHostColor("sysad"));
    expect(badgeHostColor("アルゴリズム班")).toBe(badgeHostColor("Algorithm"));
    expect(badgeHostColor("SysAd-fans")).toBe("#9baec5");
    const unknown = buildLectureBadge({ ...input, hostGroupNames: ["unknown"] });
    expect(unknown.outer).toContain("#9baec5");
    expect(unknown.svg).not.toContain("hsl(");
  });

  it("never interpolates names, group names or instance IDs into SVG markup", () => {
    const attack = '"><script>alert(1)</script>';
    const badge = buildLectureBadge({
      lectureName: attack,
      hostGroupNames: [attack, "SysAd"],
      family: attack,
      instanceId: attack,
    });
    expect(badge.svg).not.toContain("<script");
    expect(badge.svg).not.toContain("alert(1)");
  });
});
