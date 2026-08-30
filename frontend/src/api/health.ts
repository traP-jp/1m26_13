import { apiClient } from "@/api/client";
import type { ApiClient } from "@/api/client";
import type { components } from "@/api/schema";

export type HealthResponse = components["schemas"]["HealthResponse"];

export async function getHealth(client: ApiClient = apiClient): Promise<HealthResponse> {
  const { data, response } = await client.GET("/health");

  if (!response.ok || data === undefined) {
    throw new Error(`health request failed: ${response.status}`);
  }

  return data;
}
