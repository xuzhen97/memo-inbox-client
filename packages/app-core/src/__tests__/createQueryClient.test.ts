import { describe, expect, it } from "vitest";

import { createQueryClient } from "../query/createQueryClient";

describe("createQueryClient", () => {
  it("creates a QueryClient with baseline default query options only", () => {
    const queryClient = createQueryClient();
    const defaultOptions = queryClient.getDefaultOptions();

    expect(queryClient).toBeDefined();
    expect(defaultOptions.queries?.staleTime).toBe(30_000);
    expect(defaultOptions.queries?.gcTime).toBe(5 * 60_000);
    expect((defaultOptions.queries as Record<string, unknown> | undefined)?.draftStorageKey).toBeUndefined();
  });
});
