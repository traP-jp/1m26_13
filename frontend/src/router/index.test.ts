import { describe, expect, it } from "vitest";
import { createMemoryHistory } from "vue-router";

import { createAppRouter } from "./index";

describe("router", () => {
  it("resolves the home route", async () => {
    const router = createAppRouter(createMemoryHistory());

    await router.push("/");

    expect(router.currentRoute.value.name).toBe("home");
  });

  it("resolves unknown paths to the not-found route", async () => {
    const router = createAppRouter(createMemoryHistory());

    await router.push("/unknown/path");

    expect(router.currentRoute.value.name).toBe("not-found");
  });

  it("does not expose a learner session detail route", async () => {
    const router = createAppRouter(createMemoryHistory());

    await router.push("/sessions/1");

    expect(router.currentRoute.value.name).toBe("not-found");
  });
});
