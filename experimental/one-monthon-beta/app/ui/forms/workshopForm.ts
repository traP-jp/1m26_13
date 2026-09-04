import type { OccurrenceInput, WorkshopDetail, WorkshopInput } from '../../lib/contracts';

export function blankOccurrence(sequenceNumber = 1): OccurrenceInput {
  return { sequenceNumber, kind: 'standard', copiedFromOccurrenceId: null, title: null, description: '', team: '', year: new Date().getFullYear(), scheduledAt: null, location: '', instructor: '', audience: '', prerequisites: '', materialUrl: null, materialLabel: '教材を開く', status: 'draft' };
}

export function blankWorkshop(includeFirstOccurrence = true): WorkshopInput {
  return { title: '', summary: '', prerequisiteIds: [], successorIds: [], occurrences: includeFirstOccurrence ? [blankOccurrence()] : [] };
}

export function detailToInput(detail: WorkshopDetail): WorkshopInput {
  return { title: detail.title, summary: detail.summary, prerequisiteIds: detail.prerequisites.map((item) => item.id), successorIds: detail.successors.map((item) => item.id), occurrences: detail.occurrences.map((item) => ({ ...item })) };
}

export function renumberOccurrenceGroups(occurrences: OccurrenceInput[]): OccurrenceInput[] {
  const sequenceNumbers = [...new Set(occurrences.map((item) => item.sequenceNumber))].sort((a, b) => a - b);
  const nextNumberByCurrent = new Map(sequenceNumbers.map((number, index) => [number, index + 1]));
  return occurrences.map((item) => ({ ...item, sequenceNumber: nextNumberByCurrent.get(item.sequenceNumber) ?? item.sequenceNumber }));
}
