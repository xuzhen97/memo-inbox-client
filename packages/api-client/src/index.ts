import type { AppError } from "@memo-inbox/shared-types";

export const queryKeys = {
  memos: ["memos"] as const,
  tasks: ["tasks"] as const,
  maintenance: ["maintenance"] as const
};

export function createApiClient() {
  throw new Error("API client has not been implemented yet.");
}

export function createTaskEventClient() {
  throw new Error("Task event client has not been implemented yet.");
}

export function createApiError(message = "Unknown API error"): AppError {
  return {
    code: "API_CLIENT_PLACEHOLDER",
    message,
    status: 500
  };
}
