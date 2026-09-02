import { completeWorkshop, uncompleteWorkshop } from '../../../../../../db/repository';
import { apiFailure } from '../../../../../../lib/http';
import { parsePositiveId } from '../../../../../../lib/domain';

type Context = { params: Promise<{ id: string; workshopId: string }> };

export async function PUT(_request: Request, context: Context) {
  try {
    const { id, workshopId } = await context.params;
    return Response.json(await completeWorkshop(id, parsePositiveId(workshopId, '講習会')));
  } catch (error) {
    return apiFailure(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const { id, workshopId } = await context.params;
    return Response.json(await uncompleteWorkshop(id, parsePositiveId(workshopId, '講習会')));
  } catch (error) {
    return apiFailure(error);
  }
}
