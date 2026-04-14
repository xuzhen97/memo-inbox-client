import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import type { createApiClient } from "./index";
import { queryKeys } from "./index";
import type { CreateMemoInput, UpdateMemoInput, SearchMemosInput } from "@memo-inbox/shared-types";

export type ApiClient = ReturnType<typeof createApiClient>;
type QueryInvalidator = Pick<ReturnType<typeof useQueryClient>, "invalidateQueries">;

export function invalidateMemoQueries(queryClient: QueryInvalidator, memoId?: string) {
  if (memoId) {
    queryClient.invalidateQueries({ queryKey: [...queryKeys.memos, "detail", memoId] });
  }

  queryClient.invalidateQueries({ queryKey: [...queryKeys.memos, "list"] });
  queryClient.invalidateQueries({ queryKey: [...queryKeys.memos, "search"] });
  queryClient.invalidateQueries({ queryKey: [...queryKeys.memos, "trash"] });
}

export function useMemoList(apiClient: ApiClient, input?: { limit?: number; cursor?: string }) {
  return useQuery({
    queryKey: [...queryKeys.memos, "list", input],
    queryFn: () => apiClient.memos.list(input),
  });
}
 
export function useInfiniteMemoList(apiClient: ApiClient, input: { limit?: number } = {}) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.memos, "list", "infinite", input],
    queryFn: ({ pageParam }) => apiClient.memos.list({ ...input, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
  });
}

export function useMemo(apiClient: ApiClient, memoId: string) {
  return useQuery({
    queryKey: [...queryKeys.memos, "detail", memoId],
    queryFn: () => apiClient.memos.get(memoId),
    enabled: !!memoId,
  });
}

export function useCreateMemo(apiClient: ApiClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMemoInput) => apiClient.memos.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.memos });
    },
  });
}

export function useUpdateMemo(apiClient: ApiClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memoId, input }: { memoId: string; input: UpdateMemoInput }) =>
      apiClient.memos.update(memoId, input),
    onSuccess: (_, variables) => {
      invalidateMemoQueries(queryClient, variables.memoId);
    },
  });
}

export function useRemoveMemo(apiClient: ApiClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memoId: string) => apiClient.memos.remove(memoId),
    onSuccess: (_, memoId) => {
      invalidateMemoQueries(queryClient, memoId);
    },
  });
}

export function useRestoreMemo(apiClient: ApiClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memoId: string) => apiClient.memos.restore(memoId),
    onSuccess: (_, memoId) => {
      invalidateMemoQueries(queryClient, memoId);
    },
  });
}

export function usePurgeMemo(apiClient: ApiClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memoId: string) => apiClient.memos.purge(memoId),
    onSuccess: (_, memoId) => {
      invalidateMemoQueries(queryClient, memoId);
    },
  });
}

export function useTrashList(apiClient: ApiClient) {
  return useQuery({
    queryKey: [...queryKeys.memos, "trash"],
    queryFn: () => apiClient.trash.list(),
  });
}

export function useMemoSearch(apiClient: ApiClient, input?: SearchMemosInput) {
  return useQuery({
    queryKey: [...queryKeys.memos, "search", input],
    queryFn: () => apiClient.search.query(input),
  });
}
 
export function useInfiniteMemoSearch(apiClient: ApiClient, input: SearchMemosInput = {}) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.memos, "search", "infinite", input],
    queryFn: ({ pageParam }) => apiClient.search.query({ ...input, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
  });
}

export function useReviewRandomMemo(apiClient: ApiClient) {
  return useQuery({
    queryKey: [...queryKeys.memos, "review", "random"],
    queryFn: () => apiClient.review.random(),
  });
}
 
export function useMemoMaintenanceStatus(apiClient: ApiClient) {
  return useQuery({
    queryKey: [...queryKeys.maintenance, "status"],
    queryFn: () => apiClient.maintenance.getStatus(),
    refetchInterval: 30000, // Refresh every 30s
  });
}
