export const EDITOR_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type EditorDraftEntityType = "lecture" | "session";

export type EditorAttributeDraft = {
  entityType: EditorDraftEntityType;
  entityId: string;
  attributePath: string;
  baseValue: unknown;
  nextValue: unknown;
  updatedAt: string;
};

export type EditorDraftResolution =
  | { action: "auto_restore"; draft: EditorAttributeDraft }
  | {
      action: "discard";
      reason: "expired" | "server_matches_next";
      draft: EditorAttributeDraft;
    }
  | { action: "manual_review"; draft: EditorAttributeDraft };

type DraftEnvelope = { version: 1; drafts: EditorAttributeDraft[] };
type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function defaultStorage(): StorageLike | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage;
}

function identity(draft: Pick<EditorAttributeDraft, "entityType" | "entityId" | "attributePath">) {
  return `${draft.entityType}\u0000${draft.entityId}\u0000${draft.attributePath}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function attributeValuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length &&
      left.every((value, index) => attributeValuesEqual(value, right[index]))
    );
  }
  if (isRecord(left) && isRecord(right)) {
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every(
        (key, index) => key === rightKeys[index] && attributeValuesEqual(left[key], right[key]),
      )
    );
  }
  return false;
}

export function editorDraftStorageKey(lectureId: string) {
  return `1monthon:lecture-editor:v1:${lectureId}`;
}

export function isEditorDraftExpired(
  draft: EditorAttributeDraft,
  now = Date.now(),
  ttlMs = EDITOR_DRAFT_TTL_MS,
) {
  const updatedAt = Date.parse(draft.updatedAt);
  return !Number.isFinite(updatedAt) || now - updatedAt >= ttlMs;
}

export function resolveEditorDraft(
  draft: EditorAttributeDraft,
  serverValue: unknown,
  now = Date.now(),
): EditorDraftResolution {
  if (isEditorDraftExpired(draft, now)) return { action: "discard", reason: "expired", draft };
  if (attributeValuesEqual(serverValue, draft.nextValue)) {
    return { action: "discard", reason: "server_matches_next", draft };
  }
  if (attributeValuesEqual(serverValue, draft.baseValue)) return { action: "auto_restore", draft };
  return { action: "manual_review", draft };
}

export function loadEditorDrafts(
  lectureId: string,
  storage = defaultStorage(),
  now = Date.now(),
): EditorAttributeDraft[] {
  if (!storage) return [];
  const key = editorDraftStorageKey(lectureId);
  const raw = storage.getItem(key);
  if (!raw) return [];
  try {
    const envelope = JSON.parse(raw) as Partial<DraftEnvelope>;
    const drafts = Array.isArray(envelope.drafts)
      ? envelope.drafts.filter(isEditorAttributeDraft)
      : [];
    const current = drafts.filter((draft) => !isEditorDraftExpired(draft, now));
    if (current.length === 0) storage.removeItem(key);
    else if (current.length !== drafts.length) writeEnvelope(key, current, storage);
    return current;
  } catch {
    storage.removeItem(key);
    return [];
  }
}

export function saveEditorDraft(
  lectureId: string,
  draft: EditorAttributeDraft,
  storage = defaultStorage(),
) {
  if (!storage) return;
  const drafts = loadEditorDrafts(lectureId, storage);
  const draftId = identity(draft);
  const next = drafts.filter((entry) => identity(entry) !== draftId);
  if (!attributeValuesEqual(draft.baseValue, draft.nextValue)) next.push(draft);
  writeEnvelope(editorDraftStorageKey(lectureId), next, storage);
}

export function removeEditorDraft(
  lectureId: string,
  draft: Pick<EditorAttributeDraft, "entityType" | "entityId" | "attributePath">,
  storage = defaultStorage(),
) {
  if (!storage) return;
  const remaining = loadEditorDrafts(lectureId, storage).filter(
    (entry) => identity(entry) !== identity(draft),
  );
  writeEnvelope(editorDraftStorageKey(lectureId), remaining, storage);
}

function writeEnvelope(key: string, drafts: EditorAttributeDraft[], storage: StorageLike) {
  if (drafts.length === 0) {
    storage.removeItem(key);
    return;
  }
  const envelope: DraftEnvelope = { version: 1, drafts };
  storage.setItem(key, JSON.stringify(envelope));
}

function isEditorAttributeDraft(value: unknown): value is EditorAttributeDraft {
  if (!isRecord(value)) return false;
  return (
    (value.entityType === "lecture" || value.entityType === "session") &&
    typeof value.entityId === "string" &&
    typeof value.attributePath === "string" &&
    "baseValue" in value &&
    "nextValue" in value &&
    typeof value.updatedAt === "string"
  );
}
