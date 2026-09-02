import type { ApiErrorBody, DiscoveryResponse, RoadmapDetail, RoadmapInput, RoadmapManage, UserProfile, WorkshopDetail, WorkshopInput } from '../lib/contracts';

export class ApiClientError extends Error {
  constructor(message: string, readonly status: number, readonly code: string, readonly fields: Record<string, string> = {}) { super(message); this.name = 'ApiClientError'; }
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try { response = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } }); }
  catch { throw new ApiClientError('サーバーへ接続できませんでした。入力内容は失われていません。', 0, 'network_error'); }
  const body = await response.json().catch(() => null) as T | ApiErrorBody | null;
  if (!response.ok) { const error = (body as ApiErrorBody | null)?.error; throw new ApiClientError(error?.message ?? '処理に失敗しました。', response.status, error?.code ?? 'unknown_error', error?.fields); }
  return body as T;
}

export function fetchDiscovery(query = '', team = '', year = '') {
  const params = new URLSearchParams(); if (query.trim()) params.set('q', query.trim()); if (team) params.set('team', team); if (year) params.set('year', year);
  return requestJson<DiscoveryResponse>(`/api/workshops${params.size ? `?${params}` : ''}`);
}
export async function fetchWorkshop(id: string | number, manage = false) { const result = await requestJson<{ workshop: WorkshopDetail }>(`/api/workshops/${encodeURIComponent(id)}?userId=demo-learner${manage ? '&manage=1' : ''}`); return result.workshop; }
export async function saveWorkshop(input: WorkshopInput, id?: string | number) { const result = await requestJson<{ workshop: WorkshopDetail }>(id ? `/api/workshops/${encodeURIComponent(id)}` : '/api/workshops', { method: id ? 'PUT' : 'POST', body: JSON.stringify(input) }); return result.workshop; }
export async function copyOccurrence(workshopId: number, occurrenceId: number, kind: 'standard' | 'rebroadcast') { const result = await requestJson<{ workshop: WorkshopDetail }>(`/api/workshops/${workshopId}/occurrences/${occurrenceId}/copy`, { method: 'POST', body: JSON.stringify({ kind }) }); return result.workshop; }
export function completeWorkshop(workshopId: number) { return requestJson<{ profile: UserProfile }>(`/api/users/demo-learner/completions/${workshopId}`, { method: 'PUT' }); }
export function uncompleteWorkshop(workshopId: number) { return requestJson<{ profile: UserProfile }>(`/api/users/demo-learner/completions/${workshopId}`, { method: 'DELETE' }); }
export async function fetchProfile(id = 'demo-learner') { const result = await requestJson<{ profile: UserProfile }>(`/api/users/${encodeURIComponent(id)}`); return result.profile; }
export async function fetchRoadmap(id: string | number) { const result = await requestJson<{ roadmap: RoadmapDetail }>(`/api/roadmaps/${encodeURIComponent(id)}?userId=demo-learner`); return result.roadmap; }
export async function fetchManagedRoadmaps() { const result = await requestJson<{ roadmaps: RoadmapManage[] }>('/api/roadmaps'); return result.roadmaps; }
export async function fetchManagedRoadmap(id: string | number) { const result = await requestJson<{ roadmap: RoadmapManage }>(`/api/roadmaps/${encodeURIComponent(id)}?manage=1`); return result.roadmap; }
export async function saveRoadmap(input: RoadmapInput, id?: string | number) { const result = await requestJson<{ roadmap: RoadmapManage }>(id ? `/api/roadmaps/${encodeURIComponent(id)}` : '/api/roadmaps', { method: id ? 'PUT' : 'POST', body: JSON.stringify(input) }); return result.roadmap; }
export async function removeRoadmap(id: string | number) { await requestJson<never>(`/api/roadmaps/${encodeURIComponent(id)}`, { method: 'DELETE' }); }
