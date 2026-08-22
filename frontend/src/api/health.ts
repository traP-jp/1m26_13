export interface HealthResponse {
  status: string;
}

export async function getHealth(fetcher: typeof fetch = fetch): Promise<HealthResponse> {
  const response = await fetcher("/api/health");
  if (!response.ok) {
    throw new Error(`health request failed: ${response.status}`);
  }

  return (await response.json()) as HealthResponse;
}
