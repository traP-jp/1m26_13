#!/usr/bin/env node

import process from "node:process";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const DEFAULT_API_BASE = "https://q.trap.jp/api/v3";
export const DEFAULT_CHANNEL_PATH = "event/1-Monthon/26/13/Zenn";
export const DEFAULT_STAMP_NAME = "eyes";
export const KEYCHAIN_ACCOUNT = "1-monthon";
export const KEYCHAIN_SERVICE = "codex.1-monthon.traq-bot-token";

function readKeychainToken() {
  try {
    return execFileSync(
      "/usr/bin/security",
      ["find-generic-password", "-a", KEYCHAIN_ACCOUNT, "-s", KEYCHAIN_SERVICE, "-w"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
  } catch {
    return "";
  }
}

function readToken(env, keychainTokenReader) {
  const token = env.TRAQ_BOT_TOKEN?.trim()
    || env.TRAQ_ACCESS_TOKEN?.trim()
    || keychainTokenReader();
  if (!token) {
    throw new Error(
      "traQ Botトークンが見つかりません。macOS Keychainへ登録するか、" +
        "TRAQ_BOT_TOKENまたはTRAQ_ACCESS_TOKENを設定してください。",
    );
  }
  return token;
}

function normalizeBaseUrl(value) {
  return value.replace(/\/+$/, "");
}

function parseArgs(argv) {
  const options = {
    apiBase: DEFAULT_API_BASE,
    channelId: undefined,
    channelPath: DEFAULT_CHANNEL_PATH,
    dryRun: false,
    json: false,
    quiet: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--dry-run") {
      options.dryRun = true;
    } else if (argument === "--json") {
      options.json = true;
    } else if (argument === "--quiet") {
      options.quiet = true;
    } else if (argument === "--api-base") {
      options.apiBase = argv[++index];
    } else if (argument === "--channel-id") {
      options.channelId = argv[++index];
    } else if (argument === "--channel-path") {
      options.channelPath = argv[++index];
    } else if (argument === "--help" || argument === "-h") {
      options.help = true;
    } else {
      throw new Error(`不明な引数です: ${argument}`);
    }
  }

  for (const [name, value] of [
    ["--api-base", options.apiBase],
    ["--channel-path", options.channelPath],
  ]) {
    if (!value) throw new Error(`${name}には値が必要です。`);
  }
  return options;
}

function usage() {
  return `Usage: npm run feedback:check -- [options]

Zennチャンネルで最後の :eyes: より後に投稿された内容を出力し、
未確認投稿があれば最新投稿へBot名義で :eyes: を1個付けます。

Environment:
  TRAQ_BOT_TOKEN       traQ Botトークン（推奨）
  TRAQ_ACCESS_TOKEN    上記がない場合のトークン
  TRAQ_CHANNEL_ID      指定時はチャンネルパスの名前解決を省略
  TRAQ_EYES_STAMP_ID   指定時はeyesスタンプの名前解決を省略
  TRAQ_API_BASE        API URL（既定: ${DEFAULT_API_BASE}）

Keychain:
  service=${KEYCHAIN_SERVICE}, account=${KEYCHAIN_ACCOUNT}
  環境変数がない場合にmacOS Keychainから読みます。

Options:
  --dry-run             内容を出力するがスタンプを付けない
  --json                機械可読なJSONで出力する
  --quiet               投稿内容を出力しない（接続確認用）
  --channel-id ID       対象チャンネルUUID
  --channel-path PATH   対象パス（既定: ${DEFAULT_CHANNEL_PATH}）
  --api-base URL        traQ APIのベースURL
  -h, --help            このヘルプを表示する`;
}

async function requestJson(fetchImpl, apiBase, token, pathname, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body) headers.set("Content-Type", "application/json");

  const response = await fetchImpl(`${apiBase}${pathname}`, {
    ...init,
    headers,
  });
  if (!response.ok) {
    const detail = (await response.text()).trim();
    throw new Error(
      `traQ API ${init.method ?? "GET"} ${pathname} が失敗しました (${response.status})${
        detail ? `: ${detail.slice(0, 300)}` : ""
      }`,
    );
  }

  return {
    data: response.status === 204 ? undefined : await response.json(),
    headers: response.headers,
  };
}

async function resolveChannelId(fetchImpl, apiBase, token, expectedPath) {
  const query = new URLSearchParams({ "include-dm": "false", path: expectedPath });
  const { data } = await requestJson(
    fetchImpl,
    apiBase,
    token,
    `/channels?${query}`,
  );
  if (!data || !Array.isArray(data.public)) {
    throw new Error("チャンネル一覧の形式が不正です。");
  }
  if (data.public.length !== 1) {
    throw new Error(
      `チャンネルを一意に解決できませんでした: ${expectedPath} (${data.public.length}件)`,
    );
  }
  return data.public[0].id;
}

async function resolveStampId(fetchImpl, apiBase, token, stampName) {
  const { data: stamps } = await requestJson(fetchImpl, apiBase, token, "/stamps");
  if (!Array.isArray(stamps)) throw new Error("スタンプ一覧の形式が不正です。");

  const matches = stamps.filter((stamp) => stamp.name === stampName);
  if (matches.length !== 1) {
    throw new Error(
      `:${stampName}: スタンプを一意に解決できませんでした (${matches.length}件)。` +
        " TRAQ_EYES_STAMP_IDを指定してください。",
    );
  }
  return matches[0].id;
}

function hasStamp(message, stampId) {
  return Array.isArray(message.stamps)
    && message.stamps.some((stamp) => stamp.stampId === stampId && stamp.count > 0);
}

async function findMessagesAfterLastEyes(fetchImpl, apiBase, token, channelId, stampId) {
  const pendingNewestFirst = [];
  const limit = 200;

  for (let offset = 0; ; offset += limit) {
    const query = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      order: "desc",
    });
    const { data: messages, headers } = await requestJson(
      fetchImpl,
      apiBase,
      token,
      `/channels/${encodeURIComponent(channelId)}/messages?${query}`,
    );
    if (!Array.isArray(messages)) throw new Error("メッセージ一覧の形式が不正です。");

    for (const message of messages) {
      if (hasStamp(message, stampId)) {
        return pendingNewestFirst.reverse();
      }
      pendingNewestFirst.push(message);
    }

    if (headers.get("x-traq-more") !== "true" || messages.length === 0) {
      return pendingNewestFirst.reverse();
    }
  }
}

function messageUrl(origin, channelId, messageId) {
  return `${origin}/channels/${channelId}/${messageId}`;
}

function printResult(result, { json, stdout }) {
  if (json) {
    stdout.write(`${JSON.stringify(result)}\n`);
    return;
  }

  if (result.messages.length === 0) {
    stdout.write("新しい投稿はありません。\n");
    return;
  }

  stdout.write(`未確認の投稿: ${result.messages.length}件\n`);
  for (const message of result.messages) {
    stdout.write(`\n---\n${message.createdAt} ${message.url}\n${message.content}\n`);
  }
  stdout.write(
    result.stamped
      ? `\n最新投稿 ${result.latestMessageId} に :eyes: を付けました。\n`
      : "\n--dry-run のため :eyes: は付けていません。\n",
  );
}

export async function runTraqFeedbackCheck({
  argv = [],
  env = process.env,
  fetchImpl = globalThis.fetch,
  keychainTokenReader = readKeychainToken,
  stdout = process.stdout,
} = {}) {
  const options = parseArgs(argv);
  if (options.help) {
    stdout.write(`${usage()}\n`);
    return { help: true };
  }

  const token = readToken(env, keychainTokenReader);
  const apiBase = normalizeBaseUrl(env.TRAQ_API_BASE?.trim() || options.apiBase);
  const channelId = options.channelId?.trim()
    || env.TRAQ_CHANNEL_ID?.trim()
    || await resolveChannelId(fetchImpl, apiBase, token, options.channelPath);
  const stampId = env.TRAQ_EYES_STAMP_ID?.trim()
    || await resolveStampId(fetchImpl, apiBase, token, DEFAULT_STAMP_NAME);

  const pending = await findMessagesAfterLastEyes(
    fetchImpl,
    apiBase,
    token,
    channelId,
    stampId,
  );
  const latest = pending.at(-1);

  if (latest && !options.dryRun) {
    await requestJson(
      fetchImpl,
      apiBase,
      token,
      `/messages/${encodeURIComponent(latest.id)}/stamps/${encodeURIComponent(stampId)}`,
      { method: "POST", body: JSON.stringify({ count: 1 }) },
    );
  }

  const webOrigin = new URL(apiBase).origin;
  const result = {
    channelId,
    channelPath: options.channelPath,
    count: pending.length,
    latestMessageId: latest?.id ?? null,
    stamped: Boolean(latest && !options.dryRun),
    messages: pending.map((message) => ({
      id: message.id,
      userId: message.userId,
      createdAt: message.createdAt,
      content: message.content,
      url: messageUrl(webOrigin, channelId, message.id),
    })),
  };
  if (!options.quiet) printResult(result, { json: options.json, stdout });
  return result;
}

const isMain = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  runTraqFeedbackCheck({ argv: process.argv.slice(2) }).catch((error) => {
    process.stderr.write(`traQ確認に失敗しました: ${error.message}\n`);
    process.exitCode = 1;
  });
}
