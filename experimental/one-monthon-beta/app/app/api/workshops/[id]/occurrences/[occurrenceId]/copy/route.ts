import { duplicateOccurrence } from '../../../../../../../db/repository';
import { DomainError, parsePositiveId } from '../../../../../../../lib/domain';
import { apiFailure, readJson } from '../../../../../../../lib/http';

type Context = { params: Promise<{ id: string; occurrenceId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { id, occurrenceId } = await context.params;
    const body = await readJson(request) as { kind?: unknown };
    if (body.kind !== 'standard' && body.kind !== 'rebroadcast') throw new DomainError(422, 'validation_error', '複製方法を選んでください。');
    const workshop = await duplicateOccurrence(parsePositiveId(id, '講習会'), parsePositiveId(occurrenceId, '開催'), body.kind);
    return Response.json({ workshop }, { status: 201 });
  } catch (error) { return apiFailure(error); }
}
