import { createWorkshop, listDiscovery } from '../../../db/repository';
import { validateWorkshopInput } from '../../../lib/domain';
import { apiFailure, readJson } from '../../../lib/http';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const result = await listDiscovery(url.searchParams.get('q') ?? '', url.searchParams.get('team') ?? '', url.searchParams.get('year') ?? '');
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = validateWorkshopInput(await readJson(request));
    const workshop = await createWorkshop(input);
    return Response.json({ workshop }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
