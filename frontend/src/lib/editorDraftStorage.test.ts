import { describe, expect, it } from "vitest";

import {
  EDITOR_DRAFT_TTL_MS,
  editorDraftStorageKey,
  loadEditorDrafts,
  removeEditorDraft,
  resolveEditorDraft,
  saveEditorDraft,
  type EditorAttributeDraft,
} from "./editorDraftStorage";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

const now = Date.parse("2026-09-05T12:00:00.000Z");

function draft(overrides: Partial<EditorAttributeDraft> = {}): EditorAttributeDraft {
  return {
    entityType: "session",
    entityId: "1",
    attributePath: "session.name",
    baseValue: "第1回",
    nextValue: "HTML入門",
    updatedAt: new Date(now).toISOString(),
    ...overrides,
  };
}

describe("resolveEditorDraft", () => {
  it("automatically restores only when the server still has the base value", () => {
    expect(resolveEditorDraft(draft(), "第1回", now).action).toBe("auto_restore");
  });

  it("discards a draft already reflected by the server", () => {
    expect(resolveEditorDraft(draft(), "HTML入門", now)).toMatchObject({
      action: "discard",
      reason: "server_matches_next",
    });
  });

  it("requires manual review when the server changed independently", () => {
    expect(resolveEditorDraft(draft(), "別の編集", now).action).toBe("manual_review");
  });

  it("discards drafts at least seven days old", () => {
    const expired = draft({ updatedAt: new Date(now - EDITOR_DRAFT_TTL_MS).toISOString() });
    expect(resolveEditorDraft(expired, expired.baseValue, now)).toMatchObject({
      action: "discard",
      reason: "expired",
    });
  });

  it("compares arrays and objects structurally", () => {
    const structured = draft({
      baseValue: { title: "資料", url: "https://example.com" },
      nextValue: [{ title: "参考", url: "https://example.com/ref" }],
    });
    expect(
      resolveEditorDraft(structured, { url: "https://example.com", title: "資料" }, now).action,
    ).toBe("auto_restore");
  });
});

describe("editor draft storage", () => {
  it("stores one latest unsent difference per attribute and removes it on success", () => {
    const storage = new MemoryStorage();
    saveEditorDraft("10", draft(), storage);
    saveEditorDraft("10", draft({ nextValue: "CSS入門" }), storage);

    expect(loadEditorDrafts("10", storage, now)).toEqual([draft({ nextValue: "CSS入門" })]);

    removeEditorDraft("10", draft(), storage);
    expect(loadEditorDrafts("10", storage, now)).toEqual([]);
    expect(storage.getItem(editorDraftStorageKey("10"))).toBeNull();
  });

  it("does not retain a value that is no longer different from its base", () => {
    const storage = new MemoryStorage();
    saveEditorDraft("10", draft(), storage);
    saveEditorDraft("10", draft({ nextValue: "第1回" }), storage);

    expect(loadEditorDrafts("10", storage, now)).toEqual([]);
  });

  it("prunes expired and malformed drafts while loading", () => {
    const storage = new MemoryStorage();
    const current = draft();
    const expired = draft({
      attributePath: "session.description",
      updatedAt: new Date(now - EDITOR_DRAFT_TTL_MS - 1).toISOString(),
    });
    storage.setItem(
      editorDraftStorageKey("10"),
      JSON.stringify({ version: 1, drafts: [current, expired, { entityType: "lecture" }] }),
    );

    expect(loadEditorDrafts("10", storage, now)).toEqual([current]);
    expect(JSON.parse(storage.getItem(editorDraftStorageKey("10"))!)).toEqual({
      version: 1,
      drafts: [current],
    });
  });
});
