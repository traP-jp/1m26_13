import createClient from "openapi-fetch";

import type { paths } from "@/api/schema";

export const apiBaseURL = "/api/v1";

interface CreateApiClientOptions {
  baseURL?: string;
  fetch?: typeof fetch;
}

export function createApiClient(options: CreateApiClientOptions = {}) {
  return createClient<paths>({
    baseUrl: options.baseURL ?? apiBaseURL,
    fetch: options.fetch,
  });
}

export type ApiClient = ReturnType<typeof createApiClient>;

export const apiClient = createApiClient();
