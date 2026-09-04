export type OptionalLoadResult<T> = {
  value: T;
  error: string;
};

export async function loadOptional<T>(
  promise: Promise<T>,
  fallback: T,
): Promise<OptionalLoadResult<T>> {
  try {
    return { value: await promise, error: "" };
  } catch (reason) {
    return {
      value: fallback,
      error: reason instanceof Error ? reason.message : "候補を取得できませんでした",
    };
  }
}
