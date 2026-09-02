import { createRoadmap, listRoadmapsForManage } from '../../../db/repository';
import { validateRoadmapInput } from '../../../lib/domain';
import { apiFailure, readJson } from '../../../lib/http';

export async function GET() {
  try { return Response.json({ roadmaps: await listRoadmapsForManage() }, { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return apiFailure(error); }
}

export async function POST(request: Request) {
  try { return Response.json({ roadmap: await createRoadmap(validateRoadmapInput(await readJson(request))) }, { status: 201 }); }
  catch (error) { return apiFailure(error); }
}
