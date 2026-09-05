import { describe, expect, it } from "vitest";

import { loadOptional } from "@/lib/optionalLoad";

describe("loadOptional", () => {
  it("returns loaded auxiliary data", async () => {
    await expect(loadOptional(Promise.resolve(["candidate"]), [])).resolves.toEqual({
      value: ["candidate"],
      error: "",
    });
  });

  it("turns an auxiliary API failure into a fallback without rejecting", async () => {
    await expect(loadOptional(Promise.reject(new Error("directory 502")), [])).resolves.toEqual({
      value: [],
      error: "directory 502",
    });
  });
});
