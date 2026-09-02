import type { DiscoveryResponse, OccurrenceInput, RoadmapDetail, RoadmapInput, RoadmapManage, RoadmapProgress, RoadmapSummary, UserProfile, WorkshopDetail, WorkshopInput, WorkshopOccurrence, WorkshopSummary } from '../lib/contracts';
import { assertRelations, DomainError } from '../lib/domain';
import { getD1 } from './index';
import { databaseConstants, ensureDatabase } from './setup';

type SummaryRow = { id: number; title: string; summary: string; teams: string | null; years: string | null; occurrence_count: number; latest_scheduled_at: string | null };
type OccurrenceRow = { id: number; sequence_number: number; kind: WorkshopOccurrence['kind']; copied_from_occurrence_id: number | null; title: string | null; description: string; team: string; year: number; scheduled_at: string | null; location: string; instructor: string; audience: string; prerequisites: string; material_url: string | null; material_label: string; status: WorkshopOccurrence['status'] };

export async function listDiscovery(rawQuery = '', rawTeam = '', rawYear = ''): Promise<DiscoveryResponse> {
  await ensureDatabase(); const d1 = getD1(); const query = rawQuery.trim().slice(0, 120); const team = rawTeam.trim().slice(0, 120); const year = /^\d{4}$/.test(rawYear) ? Number(rawYear) : null;
  const conditions = [`EXISTS (SELECT 1 FROM beta_occurrences visible WHERE visible.workshop_id = w.id AND visible.status = 'published')`]; const values: unknown[] = [];
  if (query) { conditions.push(`(instr(lower(w.title), lower(?)) > 0 OR instr(lower(w.summary), lower(?)) > 0 OR EXISTS (SELECT 1 FROM beta_occurrences oq WHERE oq.workshop_id = w.id AND oq.status = 'published' AND instr(lower(oq.description), lower(?)) > 0))`); values.push(query, query, query); }
  if (team) { conditions.push(`EXISTS (SELECT 1 FROM beta_occurrences ot WHERE ot.workshop_id = w.id AND ot.status = 'published' AND ot.team = ?)`); values.push(team); }
  if (year) { conditions.push(`EXISTS (SELECT 1 FROM beta_occurrences oy WHERE oy.workshop_id = w.id AND oy.status = 'published' AND oy.year = ?)`); values.push(year); }
  const statement = d1.prepare(`${summarySelect} WHERE ${conditions.join(' AND ')} GROUP BY w.id ORDER BY latest_scheduled_at DESC, w.id DESC`);
  const workshopRows = await (values.length ? statement.bind(...values) : statement).all<SummaryRow>();
  const [facets, roadmapRows] = await Promise.all([
    d1.prepare(`SELECT DISTINCT team, year FROM beta_occurrences WHERE status = 'published' ORDER BY year DESC, team`).all<{ team: string; year: number }>(),
    d1.prepare(`SELECT r.id, r.title, r.summary, r.audience, COUNT(DISTINCT i.workshop_id) workshop_count, COUNT(DISTINCT c.workshop_id) completed_count FROM beta_roadmaps r LEFT JOIN beta_roadmap_stages s ON s.roadmap_id = r.id LEFT JOIN beta_roadmap_items i ON i.stage_id = s.id LEFT JOIN beta_completions c ON c.workshop_id = i.workshop_id AND c.user_id = ? WHERE r.published = 1 AND (? = '' OR instr(lower(r.title), lower(?)) > 0 OR instr(lower(r.summary), lower(?)) > 0) GROUP BY r.id ORDER BY r.updated_at DESC`).bind(databaseConstants.demoUserId, query, query, query).all<{ id: number; title: string; summary: string; audience: string; workshop_count: number; completed_count: number }>(),
  ]);
  return { workshops: workshopRows.results.map(toSummary), roadmaps: roadmapRows.results.map(toRoadmapSummary), teams: [...new Set(facets.results.map((row) => row.team))].sort(), years: [...new Set(facets.results.map((row) => Number(row.year)))].sort((a, b) => b - a) };
}

export async function getWorkshopDetail(id: number, userId: string = databaseConstants.demoUserId, manage = false): Promise<WorkshopDetail> {
  await ensureDatabase(); const d1 = getD1();
  const row = await d1.prepare(`${summarySelect} WHERE w.id = ? GROUP BY w.id`).bind(id).first<SummaryRow & { created_at: string; updated_at: string }>();
  if (!row) throw new DomainError(404, 'workshop_not_found', '講習会が見つかりません。');
  const [occurrences, prerequisites, successors, completion, roadmaps] = await Promise.all([
    d1.prepare(`SELECT id, sequence_number, kind, copied_from_occurrence_id, title, description, team, year, scheduled_at, location, instructor, audience, prerequisites, material_url, material_label, status FROM beta_occurrences WHERE workshop_id = ? ${manage ? '' : `AND status = 'published'`} ORDER BY sequence_number, CASE kind WHEN 'standard' THEN 0 WHEN 'rebroadcast' THEN 1 ELSE 2 END, scheduled_at`).bind(id).all<OccurrenceRow>(),
    relatedWorkshops('successor_id', 'prerequisite_id', id), relatedWorkshops('prerequisite_id', 'successor_id', id),
    d1.prepare('SELECT 1 done FROM beta_completions WHERE user_id = ? AND workshop_id = ?').bind(userId, id).first(),
    listRoadmapsForWorkshop(id, userId),
  ]);
  if (!manage && occurrences.results.length === 0) throw new DomainError(404, 'workshop_not_found', '公開中の講習会が見つかりません。');
  return { ...toSummary(row), createdAt: row.created_at, updatedAt: row.updated_at, occurrences: occurrences.results.map(toOccurrence), prerequisites, successors, roadmaps, completed: Boolean(completion), canManage: true };
}

export async function createWorkshop(input: WorkshopInput): Promise<WorkshopDetail> {
  await ensureDatabase(); const d1 = getD1(); const now = new Date().toISOString();
  const inserted = await d1.prepare('INSERT INTO beta_workshops (title, summary, created_at, updated_at) VALUES (?, ?, ?, ?) RETURNING id').bind(input.title, input.summary, now, now).first<{ id: number }>();
  if (!inserted) throw new DomainError(500, 'save_failed', '講習会を保存できませんでした。');
  try { await replaceWorkshopData(inserted.id, input, now, true); } catch (error) { await d1.prepare('DELETE FROM beta_workshops WHERE id = ?').bind(inserted.id).run(); throw error; }
  return getWorkshopDetail(inserted.id, databaseConstants.demoUserId, true);
}

export async function updateWorkshop(id: number, input: WorkshopInput): Promise<WorkshopDetail> {
  await ensureDatabase(); const d1 = getD1(); await requireWorkshop(id); const now = new Date().toISOString();
  // 関係の循環や開催IDを先に検証し、失敗した保存で共通情報だけが更新されることを防ぐ。
  await replaceWorkshopData(id, input, now, false);
  await d1.prepare('UPDATE beta_workshops SET title = ?, summary = ?, updated_at = ? WHERE id = ?').bind(input.title, input.summary, now, id).run();
  return getWorkshopDetail(id, databaseConstants.demoUserId, true);
}

async function replaceWorkshopData(id: number, input: WorkshopInput, now: string, creating: boolean) {
  const d1 = getD1();
  const [knownRows, edgeRows, ownOccurrences] = await Promise.all([
    d1.prepare('SELECT id FROM beta_workshops').all<{ id: number }>(), d1.prepare('SELECT prerequisite_id, successor_id FROM beta_workshop_relations').all<{ prerequisite_id: number; successor_id: number }>(), d1.prepare('SELECT id FROM beta_occurrences WHERE workshop_id = ?').bind(id).all<{ id: number }>(),
  ]);
  const edges = assertRelations(knownRows.results.map((r) => Number(r.id)), edgeRows.results.map((r) => ({ prerequisiteId: Number(r.prerequisite_id), successorId: Number(r.successor_id) })), id, input.prerequisiteIds, input.successorIds);
  const ownIds = new Set(ownOccurrences.results.map((row) => Number(row.id))); const statements: D1PreparedStatement[] = [d1.prepare('DELETE FROM beta_workshop_relations WHERE prerequisite_id = ? OR successor_id = ?').bind(id, id)];
  for (const edge of edges) statements.push(d1.prepare('INSERT INTO beta_workshop_relations (prerequisite_id, successor_id, created_at) VALUES (?, ?, ?)').bind(edge.prerequisiteId, edge.successorId, now));
  for (const occurrence of input.occurrences) {
    if (occurrence.id) {
      if (creating || !ownIds.has(occurrence.id)) throw new DomainError(422, 'unknown_occurrence', '開催を読み込み直してください。', { occurrences: 'この講習会に属さない開催が含まれています。' });
      statements.push(updateOccurrenceStatement(occurrence, id, now));
    } else statements.push(insertOccurrenceStatement(occurrence, id, now));
  }
  await d1.batch(statements);
}

export async function duplicateOccurrence(workshopId: number, occurrenceId: number, kind: 'standard' | 'rebroadcast'): Promise<WorkshopDetail> {
  await ensureDatabase(); const d1 = getD1(); const source = await d1.prepare('SELECT * FROM beta_occurrences WHERE id = ? AND workshop_id = ?').bind(occurrenceId, workshopId).first<Record<string, unknown>>();
  if (!source) throw new DomainError(404, 'occurrence_not_found', 'コピー元の開催が見つかりません。');
  const sequence = kind === 'rebroadcast' ? Number(source.sequence_number) : Number((await d1.prepare(`SELECT COALESCE(MAX(sequence_number), 0) + 1 next FROM beta_occurrences WHERE workshop_id = ? AND kind = 'standard'`).bind(workshopId).first<{ next: number }>())?.next ?? 1);
  const now = new Date().toISOString();
  await d1.prepare(`INSERT INTO beta_occurrences (workshop_id, sequence_number, kind, copied_from_occurrence_id, title, description, team, year, scheduled_at, location, instructor, audience, prerequisites, material_url, material_label, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(workshopId, sequence, kind, occurrenceId, source.title, source.description, source.team, source.year, source.scheduled_at, source.location, source.instructor, source.audience, source.prerequisites, source.material_url, source.material_label, source.status, now, now).run();
  return getWorkshopDetail(workshopId, databaseConstants.demoUserId, true);
}

export async function completeWorkshop(userId: string, workshopId: number) { await ensureDatabase(); await assertUserAndWorkshop(userId, workshopId); await getD1().prepare('INSERT OR IGNORE INTO beta_completions (user_id, workshop_id, completed_at) VALUES (?, ?, ?)').bind(userId, workshopId, new Date().toISOString()).run(); return { profile: await getUserProfile(userId) }; }
export async function uncompleteWorkshop(userId: string, workshopId: number) { await ensureDatabase(); await assertUserAndWorkshop(userId, workshopId); await getD1().prepare('DELETE FROM beta_completions WHERE user_id = ? AND workshop_id = ?').bind(userId, workshopId).run(); return { profile: await getUserProfile(userId) }; }

export async function getUserProfile(id: string): Promise<UserProfile> {
  await ensureDatabase(); const d1 = getD1(); const user = await d1.prepare('SELECT id, display_name, created_at FROM users WHERE id = ?').bind(id).first<{ id: string; display_name: string; created_at: string }>();
  if (!user) throw new DomainError(404, 'user_not_found', '試用ユーザーが見つかりません。');
  const rows = await d1.prepare(`SELECT c.workshop_id, w.title, c.completed_at, MIN(o.team) team, MAX(o.year) year FROM beta_completions c JOIN beta_workshops w ON w.id = c.workshop_id JOIN beta_occurrences o ON o.workshop_id = w.id AND o.status = 'published' WHERE c.user_id = ? GROUP BY c.workshop_id ORDER BY c.completed_at DESC`).bind(id).all<{ workshop_id: number; title: string; completed_at: string; team: string; year: number }>();
  const completions = rows.results.map((row) => ({ workshopId: Number(row.workshop_id), title: row.title, team: row.team, year: Number(row.year), completedAt: row.completed_at }));
  const roadmapRows = await d1.prepare(`SELECT r.id, r.title, r.summary, r.audience, COUNT(DISTINCT i.workshop_id) workshop_count, COUNT(DISTINCT c.workshop_id) completed_count, MIN(CASE WHEN c.workshop_id IS NULL THEN i.workshop_id END) next_workshop_id FROM beta_roadmaps r JOIN beta_roadmap_stages s ON s.roadmap_id = r.id JOIN beta_roadmap_items i ON i.stage_id = s.id LEFT JOIN beta_completions c ON c.workshop_id = i.workshop_id AND c.user_id = ? WHERE r.published = 1 GROUP BY r.id ORDER BY r.updated_at DESC`).bind(id).all<{ id: number; title: string; summary: string; audience: string; workshop_count: number; completed_count: number; next_workshop_id: number | null }>();
  return { id: user.id, displayName: user.display_name, createdAt: user.created_at, completions, badges: completions.map((item) => ({ workshopId: item.workshopId, title: item.title, year: item.year, completedAt: item.completedAt })), roadmaps: roadmapRows.results.map((row): RoadmapProgress => ({ ...toRoadmapSummary(row), nextWorkshopId: row.next_workshop_id ? Number(row.next_workshop_id) : null })) };
}

export async function getRoadmapDetail(id: number, userId: string = databaseConstants.demoUserId): Promise<RoadmapDetail> {
  await ensureDatabase(); const d1 = getD1(); const roadmap = await d1.prepare(`SELECT r.id, r.title, r.summary, r.audience, COUNT(DISTINCT i.workshop_id) workshop_count, COUNT(DISTINCT c.workshop_id) completed_count FROM beta_roadmaps r LEFT JOIN beta_roadmap_stages s ON s.roadmap_id = r.id LEFT JOIN beta_roadmap_items i ON i.stage_id = s.id LEFT JOIN beta_completions c ON c.workshop_id = i.workshop_id AND c.user_id = ? WHERE r.id = ? AND r.published = 1 GROUP BY r.id`).bind(userId, id).first<{ id: number; title: string; summary: string; audience: string; workshop_count: number; completed_count: number }>();
  if (!roadmap) throw new DomainError(404, 'roadmap_not_found', 'ロードマップが見つかりません。');
  const rows = await d1.prepare(`SELECT s.id stage_id, s.position stage_position, i.position item_position, i.note, w.id workshop_id, w.title, w.summary, CASE WHEN c.workshop_id IS NULL THEN 0 ELSE 1 END completed FROM beta_roadmap_stages s JOIN beta_roadmap_items i ON i.stage_id = s.id JOIN beta_workshops w ON w.id = i.workshop_id LEFT JOIN beta_completions c ON c.workshop_id = w.id AND c.user_id = ? WHERE s.roadmap_id = ? ORDER BY s.position, i.position`).bind(userId, id).all<{ stage_id: number; stage_position: number; item_position: number; note: string; workshop_id: number; title: string; summary: string; completed: number }>();
  const stages = [...new Map(rows.results.map((row) => [row.stage_id, { id: Number(row.stage_id), position: Number(row.stage_position), items: rows.results.filter((item) => item.stage_id === row.stage_id).map((item) => ({ workshopId: Number(item.workshop_id), title: item.title, summary: item.summary, note: item.note, completed: Boolean(item.completed) })) }])).values()];
  return { ...toRoadmapSummary(roadmap), stages, nextWorkshopId: rows.results.find((row) => !row.completed)?.workshop_id ?? null };
}

export async function listRoadmapsForManage(): Promise<RoadmapManage[]> {
  await ensureDatabase();
  const rows = await getD1().prepare('SELECT id FROM beta_roadmaps ORDER BY updated_at DESC').all<{ id: number }>();
  return Promise.all(rows.results.map((row) => getRoadmapForManage(Number(row.id))));
}

export async function getRoadmapForManage(id: number): Promise<RoadmapManage> {
  await ensureDatabase(); const d1 = getD1();
  const roadmap = await d1.prepare('SELECT id, title, summary, audience, published, created_at, updated_at FROM beta_roadmaps WHERE id = ?').bind(id).first<{ id: number; title: string; summary: string; audience: string; published: number; created_at: string; updated_at: string }>();
  if (!roadmap) throw new DomainError(404, 'roadmap_not_found', 'ロードマップが見つかりません。');
  const rows = await d1.prepare(`SELECT s.id stage_id, s.position stage_position, i.position item_position, i.workshop_id, i.note FROM beta_roadmap_stages s LEFT JOIN beta_roadmap_items i ON i.stage_id = s.id WHERE s.roadmap_id = ? ORDER BY s.position, i.position`).bind(id).all<{ stage_id: number; stage_position: number; item_position: number | null; workshop_id: number | null; note: string | null }>();
  const stages = [...new Map(rows.results.map((row) => [Number(row.stage_id), { id: Number(row.stage_id), position: Number(row.stage_position), items: rows.results.filter((item) => item.stage_id === row.stage_id && item.workshop_id !== null).map((item) => ({ workshopId: Number(item.workshop_id), note: item.note ?? '' })) }])).values()];
  return { id: Number(roadmap.id), title: roadmap.title, summary: roadmap.summary, audience: roadmap.audience, published: Boolean(roadmap.published), createdAt: roadmap.created_at, updatedAt: roadmap.updated_at, stages };
}

export async function createRoadmap(input: RoadmapInput): Promise<RoadmapManage> {
  await ensureDatabase(); const d1 = getD1(); const now = new Date().toISOString();
  await assertRoadmapWorkshops(input);
  const inserted = await d1.prepare('INSERT INTO beta_roadmaps (title, summary, audience, published, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id').bind(input.title, input.summary, input.audience, Number(input.published), legacyRoadmapStatus(input.published), now, now).first<{ id: number }>();
  if (!inserted) throw new DomainError(500, 'save_failed', 'ロードマップを保存できませんでした。');
  try { await replaceRoadmapData(Number(inserted.id), input, now, false); }
  catch (error) { await d1.prepare('DELETE FROM beta_roadmaps WHERE id = ?').bind(inserted.id).run(); throw error; }
  return getRoadmapForManage(Number(inserted.id));
}

export async function updateRoadmap(id: number, input: RoadmapInput): Promise<RoadmapManage> {
  await ensureDatabase(); await getRoadmapForManage(id); await assertRoadmapWorkshops(input); const now = new Date().toISOString();
  await replaceRoadmapData(id, input, now, true);
  return getRoadmapForManage(id);
}

export async function deleteRoadmap(id: number): Promise<void> {
  await ensureDatabase(); await getRoadmapForManage(id);
  await getD1().prepare('DELETE FROM beta_roadmaps WHERE id = ?').bind(id).run();
}

async function assertRoadmapWorkshops(input: RoadmapInput) {
  const ids = input.stages.flatMap((stage) => stage.items.map((item) => item.workshopId));
  const rows = await getD1().prepare(`SELECT id FROM beta_workshops WHERE id IN (${ids.map(() => '?').join(',')})`).bind(...ids).all<{ id: number }>();
  if (rows.results.length !== ids.length) throw new DomainError(422, 'unknown_workshop', '講習会を選び直してください。', { stages: '存在しない講習会が含まれています。' });
}

async function replaceRoadmapData(id: number, input: RoadmapInput, now: string, updateMetadata: boolean) {
  const d1 = getD1(); const statements: D1PreparedStatement[] = [];
  if (updateMetadata) statements.push(d1.prepare('UPDATE beta_roadmaps SET title = ?, summary = ?, audience = ?, published = ?, status = ?, updated_at = ? WHERE id = ?').bind(input.title, input.summary, input.audience, Number(input.published), legacyRoadmapStatus(input.published), now, id));
  statements.push(d1.prepare('DELETE FROM beta_roadmap_stages WHERE roadmap_id = ?').bind(id));
  input.stages.forEach((stage, stageIndex) => {
    const position = stageIndex + 1;
    statements.push(d1.prepare("INSERT INTO beta_roadmap_stages (roadmap_id, position, title, description) VALUES (?, ?, '', '')").bind(id, position));
    stage.items.forEach((item, itemIndex) => statements.push(d1.prepare('INSERT INTO beta_roadmap_items (stage_id, workshop_id, position, note) SELECT id, ?, ?, ? FROM beta_roadmap_stages WHERE roadmap_id = ? AND position = ?').bind(item.workshopId, itemIndex + 1, item.note, id, position)));
  });
  await d1.batch(statements);
}

const summarySelect = `SELECT w.id, w.title, w.summary, w.created_at, w.updated_at, GROUP_CONCAT(DISTINCT CASE WHEN o.status = 'published' THEN o.team END) teams, GROUP_CONCAT(DISTINCT CASE WHEN o.status = 'published' THEN o.year END) years, COUNT(DISTINCT CASE WHEN o.status = 'published' THEN o.id END) occurrence_count, MAX(CASE WHEN o.status = 'published' THEN o.scheduled_at END) latest_scheduled_at FROM beta_workshops w LEFT JOIN beta_occurrences o ON o.workshop_id = w.id`;
function toSummary(row: SummaryRow): WorkshopSummary { return { type: 'workshop', id: Number(row.id), title: row.title, summary: row.summary, teams: row.teams?.split(',').filter(Boolean) ?? [], years: row.years?.split(',').map(Number).filter(Boolean).sort((a, b) => b - a) ?? [], occurrenceCount: Number(row.occurrence_count), latestScheduledAt: row.latest_scheduled_at } }
function toOccurrence(row: OccurrenceRow): WorkshopOccurrence { return { id: Number(row.id), sequenceNumber: Number(row.sequence_number), kind: row.kind, copiedFromOccurrenceId: row.copied_from_occurrence_id ? Number(row.copied_from_occurrence_id) : null, title: row.title, description: row.description, team: row.team, year: Number(row.year), scheduledAt: row.scheduled_at, location: row.location, instructor: row.instructor, audience: row.audience, prerequisites: row.prerequisites, materialUrl: row.material_url, materialLabel: row.material_label, status: row.status } }
function toRoadmapSummary(row: { id: number; title: string; summary: string; audience: string; workshop_count: number; completed_count: number }): RoadmapSummary { return { type: 'roadmap', id: Number(row.id), title: row.title, summary: row.summary, audience: row.audience, workshopCount: Number(row.workshop_count), completedCount: Number(row.completed_count) } }

async function relatedWorkshops(match: 'successor_id' | 'prerequisite_id', target: 'successor_id' | 'prerequisite_id', id: number) { const result = await getD1().prepare(`SELECT w.id, w.title, w.summary FROM beta_workshop_relations r JOIN beta_workshops w ON w.id = r.${target} WHERE r.${match} = ? AND EXISTS (SELECT 1 FROM beta_occurrences o WHERE o.workshop_id = w.id AND o.status = 'published') ORDER BY w.title`).bind(id).all<{ id: number; title: string; summary: string }>(); return result.results.map((row) => ({ id: Number(row.id), title: row.title, summary: row.summary })); }
async function listRoadmapsForWorkshop(id: number, userId: string) { const rows = await getD1().prepare(`SELECT r.id, r.title, r.summary, r.audience, COUNT(DISTINCT all_items.workshop_id) workshop_count, COUNT(DISTINCT c.workshop_id) completed_count FROM beta_roadmaps r JOIN beta_roadmap_stages s ON s.roadmap_id = r.id JOIN beta_roadmap_items selected ON selected.stage_id = s.id AND selected.workshop_id = ? JOIN beta_roadmap_stages all_stages ON all_stages.roadmap_id = r.id JOIN beta_roadmap_items all_items ON all_items.stage_id = all_stages.id LEFT JOIN beta_completions c ON c.workshop_id = all_items.workshop_id AND c.user_id = ? WHERE r.published = 1 GROUP BY r.id`).bind(id, userId).all<{ id: number; title: string; summary: string; audience: string; workshop_count: number; completed_count: number }>(); return rows.results.map(toRoadmapSummary); }
function legacyRoadmapStatus(published: boolean) { return published ? 'published' : 'draft'; }
async function requireWorkshop(id: number) { const row = await getD1().prepare('SELECT id FROM beta_workshops WHERE id = ?').bind(id).first(); if (!row) throw new DomainError(404, 'workshop_not_found', '講習会が見つかりません。'); }
async function assertUserAndWorkshop(userId: string, workshopId: number) { const [user, workshop] = await Promise.all([getD1().prepare('SELECT id FROM users WHERE id = ?').bind(userId).first(), getD1().prepare(`SELECT w.id FROM beta_workshops w WHERE w.id = ? AND EXISTS (SELECT 1 FROM beta_occurrences o WHERE o.workshop_id = w.id AND o.status = 'published')`).bind(workshopId).first()]); if (!user) throw new DomainError(404, 'user_not_found', '試用ユーザーが見つかりません。'); if (!workshop) throw new DomainError(404, 'workshop_not_found', '公開中の講習会が見つかりません。'); }
function occurrenceValues(o: OccurrenceInput) { return [o.sequenceNumber, o.kind, o.copiedFromOccurrenceId ?? null, o.title, o.description, o.team, o.year, o.scheduledAt, o.location, o.instructor, o.audience, o.prerequisites, o.materialUrl, o.materialLabel, o.status]; }
function insertOccurrenceStatement(o: OccurrenceInput, workshopId: number, now: string) { return getD1().prepare(`INSERT INTO beta_occurrences (workshop_id, sequence_number, kind, copied_from_occurrence_id, title, description, team, year, scheduled_at, location, instructor, audience, prerequisites, material_url, material_label, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(workshopId, ...occurrenceValues(o), now, now); }
function updateOccurrenceStatement(o: OccurrenceInput, workshopId: number, now: string) { return getD1().prepare(`UPDATE beta_occurrences SET sequence_number = ?, kind = ?, copied_from_occurrence_id = ?, title = ?, description = ?, team = ?, year = ?, scheduled_at = ?, location = ?, instructor = ?, audience = ?, prerequisites = ?, material_url = ?, material_label = ?, status = ?, updated_at = ? WHERE id = ? AND workshop_id = ?`).bind(...occurrenceValues(o), now, o.id, workshopId); }
