import { describe, expect, it } from "vitest";

import { buildBadgeSvg } from "./badgeGenerator";

describe("badge alpha seed", () => {
  it("keeps the same design for the same lecture name across lecture ids and years", () => {
    const first = buildBadgeSvg("badge-alpha-v1:Webエンジニアになろう講習会");
    const anotherYear = buildBadgeSvg("badge-alpha-v1:Webエンジニアになろう講習会");

    expect(first).toBe(anotherYear);
  });

  it("changes the design when the lecture name changes", () => {
    expect(buildBadgeSvg("badge-alpha-v1:Web講習会")).not.toBe(
      buildBadgeSvg("badge-alpha-v1:グラフィック講習会"),
    );
  });
});
