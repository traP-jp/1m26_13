import { describe, expect, it, vi } from "vitest";

import { getHealth } from "@/api/health";

describe("getHealth", () => {
  it("returns the backend status", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(getHealth(fetcher)).resolves.toEqual({ status: "ok" });
  });

  it("rejects an unsuccessful response", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 503 }));

    await expect(getHealth(fetcher)).rejects.toThrow("health request failed: 503");
  });
});
