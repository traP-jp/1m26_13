import { apiClient } from "@/api/client";
import type { ApiClient } from "@/api/client";
import type { components } from "@/api/schema";

export type CurrentUser = components["schemas"]["CurrentUser"];

export async function getCurrentUser(client: ApiClient = apiClient): Promise<CurrentUser> {
  const { data, response } = await client.GET("/users/me");

  if (!response.ok || data === undefined) {
    throw new Error(`current user request failed: ${response.status}`);
  }

  return data;
}
