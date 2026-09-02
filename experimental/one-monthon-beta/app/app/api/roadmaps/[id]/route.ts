import { deleteRoadmap, getRoadmapDetail, getRoadmapForManage, updateRoadmap } from '../../../../db/repository';
import { parsePositiveId, validateRoadmapInput } from '../../../../lib/domain';
import { apiFailure, readJson } from '../../../../lib/http';

type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  try {
    const { id } = await context.params; const url = new URL(request.url);
    const roadmapId = parsePositiveId(id, 'ロードマップ');
    const roadmap = url.searchParams.get('manage') === '1' ? await getRoadmapForManage(roadmapId) : await getRoadmapDetail(roadmapId, url.searchParams.get('userId') ?? undefined);
    return Response.json({ roadmap }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiFailure(error); }
}

export async function PUT(request: Request, context: Context) {
  try { const { id } = await context.params; return Response.json({ roadmap: await updateRoadmap(parsePositiveId(id, 'ロードマップ'), validateRoadmapInput(await readJson(request))) }); }
  catch (error) { return apiFailure(error); }
}

export async function DELETE(_request: Request, context: Context) {
  try { const { id } = await context.params; await deleteRoadmap(parsePositiveId(id, 'ロードマップ')); return new Response(null, { status: 204 }); }
  catch (error) { return apiFailure(error); }
}
