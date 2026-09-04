import { createFlow, listFlows } from '../../../db/repository';
import { validateFlowInput } from '../../../lib/domain';
import { apiFailure, readJson } from '../../../lib/http';

export async function GET() {
  try { return Response.json({ flows: await listFlows() }, { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return apiFailure(error); }
}

export async function POST(request: Request) {
  try { return Response.json({ flow: await createFlow(validateFlowInput(await readJson(request))) }, { status: 201 }); }
  catch (error) { return apiFailure(error); }
}
