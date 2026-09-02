import { getWorkshopDetail, updateWorkshop } from '../../../../db/repository';
import { parsePositiveId, validateWorkshopInput } from '../../../../lib/domain';
import { apiFailure, readJson } from '../../../../lib/http';

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    const workshop = await getWorkshopDetail(parsePositiveId(id, '講習会'), url.searchParams.get('userId') ?? undefined, url.searchParams.get('manage') === '1');
    return Response.json({ workshop }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function PUT(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const workshop = await updateWorkshop(parsePositiveId(id, '講習会'), validateWorkshopInput(await readJson(request)));
    return Response.json({ workshop });
  } catch (error) { return apiFailure(error); }
}
