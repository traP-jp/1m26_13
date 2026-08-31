import { describe, expect, it, vi } from "vitest";

import { createApiClient } from "@/api/client";
import { getCurrentUser } from "@/api/currentUser";

describe("getCurrentUser", () => {
  it("returns the authenticated user", async () => {
    const currentUser = {
      id: "00000000-0000-0000-0000-000000000001",
      traqId: "alice",
      displayName: "Alice",
    };
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(currentUser), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const client = createApiClient({
      baseURL: "http://localhost/api/v1",
      fetch: fetcher,
    });

    await expect(getCurrentUser(client)).resolves.toEqual(currentUser);

    const request = fetcher.mock.calls[0]?.[0];
    expect(request).toBeInstanceOf(Request);
    if (!(request instanceof Request)) throw new TypeError("expected fetch to receive a Request");
    expect(request.url).toBe("http://localhost/api/v1/users/me");
  });

  it("rejects an unsuccessful response", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 401 }));
    const client = createApiClient({
      baseURL: "http://localhost/api/v1",
      fetch: fetcher,
    });

    await expect(getCurrentUser(client)).rejects.toThrow("current user request failed: 401");
  });
});
