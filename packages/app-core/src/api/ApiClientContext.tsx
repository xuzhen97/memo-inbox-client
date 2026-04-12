import { createContext, useContext } from "react";
import type { createApiClient } from "@memo-inbox/api-client";

export type ApiClient = ReturnType<typeof createApiClient>;

export const ApiClientContext = createContext<ApiClient | null>(null);

export function useApiClient(): ApiClient {
  const context = useContext(ApiClientContext);
  if (!context) {
    throw new Error("useApiClient must be used within an ApiClientContext.Provider");
  }
  return context;
}
