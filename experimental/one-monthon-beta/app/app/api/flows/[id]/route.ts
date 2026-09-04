import { deleteFlow, updateFlow } from '../../../../db/repository';
import { parsePositiveId, validateFlowInput } from '../../../../lib/domain';
import { apiFailure, readJson } from '../../../../lib/http';

type Context = { params: Promise<{ id: string }> };
export async function PUT(request: Request, context: Context) {
  try { const { id } = await context.params; return Response.json({ flow: await updateFlow(parsePositiveId(id, 'フロー'), validateFlowInput(await readJson(request))) }); }
  catch (error) { return apiFailure(error); }
}
export async function DELETE(_request: Request, context: Context) {
  try { const { id } = await context.params; await deleteFlow(parsePositiveId(id, 'フロー')); return new Response(null, { status: 204 }); }
  catch (error) { return apiFailure(error); }
}
