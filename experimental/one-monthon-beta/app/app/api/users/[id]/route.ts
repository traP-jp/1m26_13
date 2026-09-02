import { getUserProfile } from '../../../../db/repository';
import { apiFailure } from '../../../../lib/http';

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    return Response.json({ profile: await getUserProfile(id) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return apiFailure(error);
  }
}
