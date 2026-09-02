import type { OccurrenceInput, OccurrenceKind, PublicationStatus, RoadmapInput, RoadmapInputStage, WorkshopInput } from './contracts';

export class DomainError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<string, string>;
  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message); this.name = 'DomainError'; this.status = status; this.code = code; this.fields = fields;
  }
}

const kinds = new Set<OccurrenceKind>(['standard', 'rebroadcast', 'digest']);
const statuses = new Set<PublicationStatus>(['draft', 'published']);

export function parsePositiveId(raw: string, label = 'ID'): number {
  if (!/^\d+$/.test(raw)) throw new DomainError(404, 'not_found', `${label}が見つかりません。`);
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id <= 0) throw new DomainError(404, 'not_found', `${label}が見つかりません。`);
  return id;
}

export function validateWorkshopInput(value: unknown, options: { allowEmptyOccurrences?: boolean } = {}): WorkshopInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new DomainError(422, 'validation_error', '入力内容を確認してください。', { form: '入力形式が正しくありません。' });
  const input = value as Record<string, unknown>; const fields: Record<string, string> = {};
  const title = requiredText(input.title, 'title', '講習会名', 100, fields);
  const summary = requiredText(input.summary, 'summary', '概要', 240, fields);
  const prerequisiteIds = idList(input.prerequisiteIds, 'prerequisiteIds', fields);
  const successorIds = idList(input.successorIds, 'successorIds', fields);
  const occurrences = Array.isArray(input.occurrences) ? input.occurrences.map((item, index) => validateOccurrence(item, index, fields)) : [];
  if (!occurrences.length && !options.allowEmptyOccurrences) fields.occurrences = '開催を1件以上入力してください。';
  if (occurrences.length > 30) fields.occurrences = '開催は30件以内で入力してください。';
  if (Object.keys(fields).length) throw new DomainError(422, 'validation_error', '入力内容を確認してください。', fields);
  return { title, summary, prerequisiteIds, successorIds, occurrences };
}

export function validateRoadmapInput(value: unknown): RoadmapInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new DomainError(422, 'validation_error', '入力内容を確認してください。', { form: '入力形式が正しくありません。' });
  const input = value as Record<string, unknown>; const fields: Record<string, string> = {};
  const title = requiredText(input.title, 'title', 'ロードマップ名', 100, fields);
  const summary = requiredText(input.summary, 'summary', '概要', 240, fields);
  const audience = requiredText(input.audience, 'audience', '対象者', 500, fields);
  const published = typeof input.published === 'boolean' ? input.published : false;
  if (typeof input.published !== 'boolean') fields.published = '公開状態を選択してください。';
  const stages = Array.isArray(input.stages) ? input.stages.map((stage, index) => validateRoadmapStage(stage, index, fields)) : [];
  if (!stages.length) fields.stages = '段階を1件以上入力してください。';
  if (stages.length > 20) fields.stages = '段階は20件以内で入力してください。';
  const workshopIds = stages.flatMap((stage) => stage.items.map((item) => item.workshopId));
  if (!workshopIds.length) fields.stages = '講習会を1件以上選択してください。';
  if (new Set(workshopIds).size !== workshopIds.length) fields.stages = '同じ講習会を複数の段階へ重複して追加できません。';
  if (Object.keys(fields).length) throw new DomainError(422, 'validation_error', '入力内容を確認してください。', fields);
  return { title, summary, audience, published, stages };
}

function validateRoadmapStage(value: unknown, index: number, fields: Record<string, string>): RoadmapInputStage {
  const key = `stages.${index}`;
  if (!value || typeof value !== 'object' || Array.isArray(value)) { fields[key] = '段階の入力形式が正しくありません。'; return { items: [] }; }
  const stage = value as Record<string, unknown>;
  const items = Array.isArray(stage.items) ? stage.items.map((value, itemIndex) => {
    const itemKey = `${key}.items.${itemIndex}`;
    if (!value || typeof value !== 'object' || Array.isArray(value)) { fields[itemKey] = '講習会の選択内容が正しくありません。'; return { workshopId: 0, note: '' }; }
    const item = value as Record<string, unknown>; const workshopId = Number(item.workshopId);
    if (!Number.isSafeInteger(workshopId) || workshopId <= 0) fields[`${itemKey}.workshopId`] = '講習会を選び直してください。';
    return { workshopId, note: optionalText(item.note, 500) ?? '' };
  }) : [];
  return { items };
}

function validateOccurrence(value: unknown, index: number, fields: Record<string, string>): OccurrenceInput {
  const key = `occurrences.${index}`;
  if (!value || typeof value !== 'object' || Array.isArray(value)) { fields[key] = '開催の入力形式が正しくありません。'; return emptyOccurrence(); }
  const item = value as Record<string, unknown>; const sequenceNumber = Number(item.sequenceNumber); const year = Number(item.year);
  const kind = kinds.has(item.kind as OccurrenceKind) ? item.kind as OccurrenceKind : 'standard';
  const status = statuses.has(item.status as PublicationStatus) ? item.status as PublicationStatus : 'draft';
  if (!Number.isInteger(sequenceNumber) || sequenceNumber < 1 || sequenceNumber > 99) fields[`${key}.sequenceNumber`] = '回番号は1〜99で入力してください。';
  if (!Number.isInteger(year) || year < 2000 || year > 2100) fields[`${key}.year`] = '年度を4桁で入力してください。';
  const scheduledAt = optionalText(item.scheduledAt, 40);
  if (scheduledAt && Number.isNaN(Date.parse(scheduledAt))) fields[`${key}.scheduledAt`] = '日時の形式が正しくありません。';
  const materialUrl = optionalText(item.materialUrl, 500);
  if (materialUrl && !/^https?:\/\//i.test(materialUrl)) fields[`${key}.materialUrl`] = '教材URLはhttpまたはhttpsで入力してください。';
  return { id: Number.isInteger(item.id) && Number(item.id) > 0 ? Number(item.id) : undefined, sequenceNumber, kind, copiedFromOccurrenceId: Number.isInteger(item.copiedFromOccurrenceId) ? Number(item.copiedFromOccurrenceId) : null, title: optionalText(item.title, 100), description: requiredText(item.description, `${key}.description`, '学べること', 3000, fields), team: requiredText(item.team, `${key}.team`, '班', 120, fields), year, scheduledAt, location: optionalText(item.location, 120) ?? '', instructor: optionalText(item.instructor, 120) ?? '', audience: requiredText(item.audience, `${key}.audience`, '対象者', 500, fields), prerequisites: optionalText(item.prerequisites, 500) ?? '', materialUrl, materialLabel: optionalText(item.materialLabel, 80) ?? '教材を開く', status };
}

function requiredText(value: unknown, key: string, label: string, max: number, fields: Record<string, string>): string {
  if (typeof value !== 'string' || !value.trim()) { fields[key] = `${label}を入力してください。`; return ''; }
  const text = value.trim(); if (text.length > max) fields[key] = `${label}は${max}文字以内で入力してください。`; return text;
}
function optionalText(value: unknown, max: number): string | null { return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null; }
function idList(value: unknown, key: string, fields: Record<string, string>): number[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((id) => !Number.isSafeInteger(id) || Number(id) <= 0)) { fields[key] = '講習会の選択内容が正しくありません。'; return []; }
  const ids = value.map(Number); if (new Set(ids).size !== ids.length) fields[key] = '同じ講習会を重複して選択できません。'; return ids;
}
function emptyOccurrence(): OccurrenceInput { return { sequenceNumber: 1, kind: 'standard', title: null, description: '', team: '', year: new Date().getFullYear(), scheduledAt: null, location: '', instructor: '', audience: '', prerequisites: '', materialUrl: null, materialLabel: '教材を開く', status: 'draft' }; }

export type RelationEdge = { prerequisiteId: number; successorId: number };
export function assertRelations(known: Iterable<number>, existing: RelationEdge[], workshopId: number, before: number[], after: number[]): RelationEdge[] {
  const knownIds = new Set(known);
  if ([...before, ...after].some((id) => id === workshopId || !knownIds.has(id))) throw new DomainError(422, 'unknown_relation', '学びのつながりを選び直してください。', { relations: '存在しないか同じ講習会が含まれています。' });
  const added = [...before.map((id) => ({ prerequisiteId: id, successorId: workshopId })), ...after.map((id) => ({ prerequisiteId: workshopId, successorId: id }))];
  const rest = existing.filter((edge) => edge.prerequisiteId !== workshopId && edge.successorId !== workshopId);
  if (hasCycle([...rest, ...added])) throw new DomainError(409, 'relation_cycle', '学びのつながりが循環します。', { relations: '循環しない順序にしてください。' });
  return added;
}
export function hasCycle(edges: RelationEdge[]): boolean {
  const next = new Map<number, number[]>(); const indegree = new Map<number, number>();
  for (const edge of edges) { next.set(edge.prerequisiteId, [...(next.get(edge.prerequisiteId) ?? []), edge.successorId]); next.set(edge.successorId, next.get(edge.successorId) ?? []); indegree.set(edge.prerequisiteId, indegree.get(edge.prerequisiteId) ?? 0); indegree.set(edge.successorId, (indegree.get(edge.successorId) ?? 0) + 1); }
  const queue = [...indegree].filter(([, count]) => count === 0).map(([id]) => id); let visited = 0;
  for (let i = 0; i < queue.length; i += 1) { visited += 1; for (const id of next.get(queue[i]) ?? []) { const count = (indegree.get(id) ?? 0) - 1; indegree.set(id, count); if (count === 0) queue.push(id); } }
  return visited !== indegree.size;
}
