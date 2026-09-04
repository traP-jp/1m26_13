import assert from "node:assert/strict";
import test from "node:test";

import { runTraqFeedbackCheck } from "../scripts/traq-zenn-feedback.mjs";

const channelId = "00000000-0000-0000-0000-000000000005";
const stampId = "10000000-0000-0000-0000-000000000005";

function jsonResponse(value, init = {}) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "Content-Type": "application/json", ...init.headers },
    ...init,
  });
}

function message(id, content, createdAt, stamps = []) {
  return { id, userId: `user-${id}`, channelId, content, createdAt, stamps };
}

function outputBuffer() {
  let value = "";
  return {
    stdout: { write: (chunk) => { value += chunk; } },
    value: () => value,
  };
}

test("最後のeyesより後の投稿を時系列で出力し、最新だけにeyesを付ける", async () => {
  const requests = [];
  const fetchImpl = async (url, init = {}) => {
    requests.push({ url, init });
    const pathname = new URL(url).pathname;
    if (pathname === "/api/v3/channels/channel/messages") {
      return jsonResponse([
        message("newest", "二つ目", "2026-09-03T00:02:00Z"),
        message("new", "一つ目", "2026-09-03T00:01:00Z"),
        message("seen", "確認済み", "2026-09-03T00:00:00Z", [
          { stampId, count: 1 },
        ]),
      ]);
    }
    if (pathname === `/api/v3/messages/newest/stamps/${stampId}`) {
      return new Response(null, { status: 204 });
    }
    throw new Error(`unexpected request: ${url}`);
  };
  const output = outputBuffer();

  const result = await runTraqFeedbackCheck({
    argv: ["--channel-id", "channel", "--json"],
    env: { TRAQ_BOT_TOKEN: "secret", TRAQ_EYES_STAMP_ID: stampId },
    fetchImpl,
    stdout: output.stdout,
  });

  assert.equal(result.count, 2);
  assert.deepEqual(result.messages.map(({ id }) => id), ["new", "newest"]);
  assert.equal(result.latestMessageId, "newest");
  assert.equal(result.stamped, true);
  const stampRequest = requests.at(-1);
  assert.equal(stampRequest.init.method, "POST");
  assert.equal(stampRequest.init.body, '{"count":1}');
  assert.equal(stampRequest.init.headers.get("Authorization"), "Bearer secret");
  assert.equal(JSON.parse(output.value()).messages[0].content, "一つ目");
});

test("最新投稿にeyesがあれば外部状態を変更しない", async () => {
  let requestCount = 0;
  const fetchImpl = async () => {
    requestCount += 1;
    return jsonResponse([
      message("seen", "確認済み", "2026-09-03T00:00:00Z", [
        { stampId, count: 1 },
      ]),
    ]);
  };
  const output = outputBuffer();

  const result = await runTraqFeedbackCheck({
    argv: ["--channel-id", channelId],
    env: { TRAQ_BOT_TOKEN: "secret", TRAQ_EYES_STAMP_ID: stampId },
    fetchImpl,
    stdout: output.stdout,
  });

  assert.equal(requestCount, 1);
  assert.equal(result.count, 0);
  assert.equal(result.stamped, false);
  assert.equal(output.value(), "新しい投稿はありません。\n");
});

test("dry-runでは未確認投稿を返すがeyesを付けない", async () => {
  let requestCount = 0;
  const fetchImpl = async () => {
    requestCount += 1;
    return jsonResponse([message("new", "未確認", "2026-09-03T00:00:00Z")]);
  };

  const result = await runTraqFeedbackCheck({
    argv: ["--channel-id", channelId, "--dry-run", "--json"],
    env: { TRAQ_BOT_TOKEN: "secret", TRAQ_EYES_STAMP_ID: stampId },
    fetchImpl,
    stdout: outputBuffer().stdout,
  });

  assert.equal(requestCount, 1);
  assert.equal(result.count, 1);
  assert.equal(result.stamped, false);
});

test("チャンネルパスとeyesをAPIから解決できる", async () => {
  const dayId = "day";
  const fetchImpl = async (url, init = {}) => {
    const parsedUrl = new URL(url);
    const { pathname } = parsedUrl;
    if (pathname === "/api/v3/channels") {
      assert.equal(parsedUrl.searchParams.get("path"), "event/1-Monthon/26/13/Zenn");
      assert.equal(parsedUrl.searchParams.get("include-dm"), "false");
      return jsonResponse({
        public: [{ id: dayId, parentId: "year", name: "Zenn" }],
      });
    }
    if (pathname === "/api/v3/stamps") {
      return jsonResponse([{ id: stampId, name: "eyes" }]);
    }
    if (pathname === `/api/v3/channels/${dayId}/messages`) return jsonResponse([]);
    throw new Error(`unexpected request: ${init.method ?? "GET"} ${url}`);
  };

  const result = await runTraqFeedbackCheck({
    argv: ["--dry-run", "--json"],
    env: { TRAQ_ACCESS_TOKEN: "secret" },
    fetchImpl,
    stdout: outputBuffer().stdout,
  });

  assert.equal(result.channelId, dayId);
  assert.equal(result.count, 0);
});

test("X-TRAQ-MOREがtrueならeyesを見つけるまでページングする", async () => {
  let page = 0;
  const fetchImpl = async (url) => {
    const { pathname } = new URL(url);
    if (pathname.includes("/messages/newest/stamps/")) {
      return new Response(null, { status: 204 });
    }
    page += 1;
    if (page === 1) {
      return jsonResponse([message("newest", "新着", "2026-09-03T00:01:00Z")], {
        headers: { "X-TRAQ-MORE": "true" },
      });
    }
    return jsonResponse([
      message("seen", "確認済み", "2026-09-03T00:00:00Z", [{ stampId, count: 1 }]),
    ]);
  };

  const result = await runTraqFeedbackCheck({
    argv: ["--channel-id", channelId, "--json"],
    env: { TRAQ_BOT_TOKEN: "secret", TRAQ_EYES_STAMP_ID: stampId },
    fetchImpl,
    stdout: outputBuffer().stdout,
  });

  assert.equal(page, 2);
  assert.deepEqual(result.messages.map(({ id }) => id), ["newest"]);
});

test("トークンをエラー出力へ漏らさない", async () => {
  await assert.rejects(
    runTraqFeedbackCheck({
      argv: ["--channel-id", channelId],
      env: { TRAQ_BOT_TOKEN: "do-not-print", TRAQ_EYES_STAMP_ID: stampId },
      fetchImpl: async () => new Response("Unauthorized", { status: 401 }),
      stdout: outputBuffer().stdout,
    }),
    (error) => !error.message.includes("do-not-print") && error.message.includes("401"),
  );
});

test("環境変数がない場合はmacOS Keychainのトークンを使う", async () => {
  let authorization;
  const fetchImpl = async (_url, init) => {
    authorization = init.headers.get("Authorization");
    return jsonResponse([
      message("seen", "確認済み", "2026-09-03T00:00:00Z", [
        { stampId, count: 1 },
      ]),
    ]);
  };

  await runTraqFeedbackCheck({
    argv: ["--channel-id", channelId],
    env: { TRAQ_EYES_STAMP_ID: stampId },
    fetchImpl,
    keychainTokenReader: () => "keychain-secret",
    stdout: outputBuffer().stdout,
  });

  assert.equal(authorization, "Bearer keychain-secret");
});

test("quietでは投稿内容を標準出力へ出さない", async () => {
  const output = outputBuffer();
  const result = await runTraqFeedbackCheck({
    argv: ["--channel-id", channelId, "--dry-run", "--quiet"],
    env: { TRAQ_BOT_TOKEN: "secret", TRAQ_EYES_STAMP_ID: stampId },
    fetchImpl: async () => jsonResponse([
      message("new", "非公開の内容", "2026-09-03T00:00:00Z"),
    ]),
    stdout: output.stdout,
  });

  assert.equal(result.count, 1);
  assert.equal(output.value(), "");
});
