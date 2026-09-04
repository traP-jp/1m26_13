/** Cloudflare Worker entry point for the workshop demo. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  TRAQ_BOT_TOKEN?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

type TraqUser = {
  id?: unknown;
  name?: unknown;
  displayName?: unknown;
  bot?: unknown;
};

type TraqGroup = {
  id?: unknown;
  name?: unknown;
  description?: unknown;
};

const TRAQ_API_ORIGIN = "https://q.trap.jp";

async function getTraqDirectory(env: Env) {
  if (!env.TRAQ_BOT_TOKEN) {
    return Response.json({ candidates: [] }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${env.TRAQ_BOT_TOKEN}`,
  };
  try {
    const [usersResponse, groupsResponse] = await Promise.all([
      fetch(`${TRAQ_API_ORIGIN}/api/v3/users?include-suspended=false`, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(5000),
      }),
      fetch(`${TRAQ_API_ORIGIN}/api/v3/groups`, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(5000),
      }),
    ]);

    if (!usersResponse.ok || !groupsResponse.ok) {
      return Response.json({ candidates: [] }, {
        status: 502,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const users = await usersResponse.json() as unknown;
    const groups = await groupsResponse.json() as unknown;
    const candidates = [
      ...(Array.isArray(users) ? users : [])
        .filter((user): user is TraqUser => Boolean(user) && typeof user === "object")
        .filter((user) => user.bot !== true && typeof user.id === "string" && typeof user.name === "string")
        .map((user) => ({
          kind: "user" as const,
          id: user.id as string,
          name: user.name as string,
          label: `@${user.name as string}`,
          detail: typeof user.displayName === "string" && user.displayName.trim()
            ? user.displayName
            : user.name as string,
        })),
      ...(Array.isArray(groups) ? groups : [])
        .filter((group): group is TraqGroup => Boolean(group) && typeof group === "object")
        .filter((group) => typeof group.id === "string" && typeof group.name === "string")
        .map((group) => ({
          kind: "group" as const,
          id: group.id as string,
          name: group.name as string,
          label: group.name as string,
          detail: typeof group.description === "string" && group.description.trim()
            ? group.description
            : "",
        })),
    ];

    return Response.json({ candidates }, {
      headers: {
        "Cache-Control": "private, max-age=300",
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  } catch {
    return Response.json({ candidates: [] }, {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    });
  }
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/traq/directory") {
      if (request.method !== "GET") {
        return Response.json({ error: "Method Not Allowed" }, {
          status: 405,
          headers: { Allow: "GET", "Cache-Control": "no-store" },
        });
      }
      return getTraqDirectory(env);
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
