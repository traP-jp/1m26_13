import { describe, expect, it } from "vitest";

import { flowApiAttributePath, flowAttributeTarget, flowFieldKind } from "./flowRuntime";

describe("flow runtime attributes", () => {
  it("maps document paths to their API target and unprefixed attribute", () => {
    expect(flowAttributeTarget("lecture.name", false)).toBe("lecture");
    expect(flowAttributeTarget("session.location", true)).toBe("session");
    expect(flowAttributeTarget("session.location", false)).toBeUndefined();
    expect(flowApiAttributePath("session.location")).toBe("location");
  });

  it("selects controls that preserve scalar value types", () => {
    expect(flowFieldKind("lecture.academicYearStart")).toBe("number");
    expect(flowFieldKind("lecture.isIntroductory")).toBe("boolean");
    expect(flowFieldKind("lecture.description")).toBe("textarea");
    expect(flowFieldKind("session.date")).toBe("date");
    expect(flowFieldKind("session.startTime")).toBe("time");
    expect(flowFieldKind("session.knoqUrl")).toBe("url");
    expect(flowFieldKind("session.status")).toBe("status");
  });
});
