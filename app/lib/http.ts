import { DomainError } from './domain';
import type { ApiErrorBody } from './contracts';

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new DomainError(400, 'invalid_json', 'JSONの形式を確認してください。');
  }
}

export function apiFailure(error: unknown): Response {
  if (error instanceof DomainError) {
    return Response.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.fields ? { fields: error.fields } : {}),
        },
      } satisfies ApiErrorBody,
      { status: error.status },
    );
  }

  console.error('Unexpected API error', error);
  return Response.json(
    {
      error: {
        code: 'internal_error',
        message: '保存または読み込みに失敗しました。少し待ってからもう一度お試しください。',
      },
    } satisfies ApiErrorBody,
    { status: 500 },
  );
}
