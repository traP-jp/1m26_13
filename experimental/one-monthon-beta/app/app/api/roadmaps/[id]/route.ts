import { getRoadmapDetail } from '../../../../db/repository';
import { parsePositiveId } from '../../../../lib/domain';
import { apiFailure } from '../../../../lib/http';

type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  try {
    const { id } = await context.params; const url = new URL(request.url);
    return Response.json({ roadmap: await getRoadmapDetail(parsePositiveId(id, 'ロードマップ'), url.searchParams.get('userId') ?? undefined) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiFailure(error); }
}
