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

type TraqChannel = {
  id?: unknown;
  name?: unknown;
  parentId?: unknown;
  archived?: unknown;
};

const TRAQ_API_ORIGIN = "https://q.trap.jp";
const TRAQ_READ_PATHS = new Set([
  "/api/v3/users?include-suspended=false",
  "/api/v3/groups",
  "/api/v3/channels?include-dm=false",
]);

async function traqGet(env: Env, path: string): Promise<unknown> {
  if (!env.TRAQ_BOT_TOKEN || !TRAQ_READ_PATHS.has(path)) throw new Error("traQ read is unavailable");
  const response = await fetch(`${TRAQ_API_ORIGIN}${path}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${env.TRAQ_BOT_TOKEN}`,
    },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error("traQ read failed");
  return response.json();
}

function channelPath(channel: TraqChannel, channelMap: Map<string, TraqChannel>) {
  const parts: string[] = [];
  const visited = new Set<string>();
  let current: TraqChannel | undefined = channel;
  for (let depth = 0; current && depth < 16; depth += 1) {
    if (typeof current.id !== "string" || visited.has(current.id)) break;
    visited.add(current.id);
    if (typeof current.name === "string" && current.name.trim()) parts.unshift(current.name.trim());
    current = typeof current.parentId === "string" ? channelMap.get(current.parentId) : undefined;
  }
  return `#${parts.join("/")}`;
}

async function getTraqDirectory(env: Env) {
  if (!env.TRAQ_BOT_TOKEN) {
    return Response.json({ candidates: [], channels: [] }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  try {
    const [usersResult, groupsResult, channelsResult] = await Promise.allSettled([
      traqGet(env, "/api/v3/users?include-suspended=false"),
      traqGet(env, "/api/v3/groups"),
      traqGet(env, "/api/v3/channels?include-dm=false"),
    ]);
    if ([usersResult, groupsResult, channelsResult].every((result) => result.status === "rejected")) {
      return Response.json({ candidates: [], channels: [] }, {
        status: 502,
        headers: { "Cache-Control": "no-store" },
      });
    }
    const users = usersResult.status === "fulfilled" && Array.isArray(usersResult.value)
      ? usersResult.value
      : null;
    const groups = groupsResult.status === "fulfilled" && Array.isArray(groupsResult.value)
      ? groupsResult.value
      : null;
    const channelPayload = channelsResult.status === "fulfilled" ? channelsResult.value : null;
    const rawChannels = Array.isArray(channelPayload)
      ? channelPayload
      : channelPayload && typeof channelPayload === "object" && Array.isArray((channelPayload as { public?: unknown }).public)
        ? (channelPayload as { public: unknown[] }).public
        : null;
    const sources = {
      users: users !== null,
      groups: groups !== null,
      channels: rawChannels !== null,
    };
    if (!sources.users && !sources.groups && !sources.channels) {
      return Response.json({ candidates: [], channels: [], sources }, {
        status: 502,
        headers: { "Cache-Control": "no-store" },
      });
    }
    const channelRecords = (rawChannels ?? []).filter(
      (channel): channel is TraqChannel => Boolean(channel)
        && typeof channel === "object"
        && typeof (channel as TraqChannel).id === "string"
        && typeof (channel as TraqChannel).name === "string"
        && ((channel as TraqChannel).parentId === null || typeof (channel as TraqChannel).parentId === "string")
        && typeof (channel as TraqChannel).archived === "boolean",
    );
    const channelMap = new Map(channelRecords.map((channel) => [channel.id as string, channel]));
    const channels = channelRecords
      .filter((channel) => channel.archived !== true)
      .map((channel) => ({
        id: channel.id as string,
        name: channel.name as string,
        path: channelPath(channel, channelMap),
      }))
      .sort((left, right) => left.path.localeCompare(right.path, "ja"));
    const candidates = [
      ...(users ?? [])
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
      ...(groups ?? [])
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

    return Response.json({ candidates, channels, sources }, {
      headers: {
        "Cache-Control": "private, max-age=300",
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  } catch {
    return Response.json({ candidates: [], channels: [] }, {
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
