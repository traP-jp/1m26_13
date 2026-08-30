import { describe, expect, it, vi } from "vitest";

import { createApiClient } from "@/api/client";
import { getHealth } from "@/api/health";

describe("getHealth", () => {
  it("returns the backend status", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = createApiClient({
      baseURL: "http://localhost/api/v1",
      fetch: fetcher,
    });

    await expect(getHealth(client)).resolves.toEqual({ status: "ok" });
    expect(fetcher).toHaveBeenCalledOnce();

    const request = fetcher.mock.calls[0]?.[0];
    expect(request).toBeInstanceOf(Request);
    if (!(request instanceof Request)) throw new TypeError("expected fetch to receive a Request");

    expect(request.url).toBe("http://localhost/api/v1/health");
  });

  it("rejects an unsuccessful response", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 503 }));

    const client = createApiClient({
      baseURL: "http://localhost/api/v1",
      fetch: fetcher,
    });

    await expect(getHealth(client)).rejects.toThrow("health request failed: 503");
  });
});
