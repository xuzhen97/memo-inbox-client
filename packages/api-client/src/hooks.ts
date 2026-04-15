import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import type { createApiClient } from "./index";
import { queryKeys } from "./index";
import type { CreateMemoInput, UpdateMemoInput, ListMemosInput } from "@memo-inbox/shared-types";

export type ApiClient = ReturnType<typeof createApiClient>;
type QueryInvalidator = Pick<ReturnType<typeof useQueryClient>, "invalidateQueries">;

export function invalidateMemoQueries(queryClient: QueryInvalidator, memoId?: string) {
  if (memoId) {
    queryClient.invalidateQueries({ queryKey: [...queryKeys.memos, "detail", memoId] });
  }

  queryClient.invalidateQueries({ queryKey: [...queryKeys.memos, "list"] });
  queryClient.invalidateQueries({ queryKey: [...queryKeys.memos, "trash"] });
}

export function useMemoList(apiClient: ApiClient, input?: ListMemosInput) {
  return useQuery({
    queryKey: [...queryKeys.memos, "list", input],
    queryFn: () => apiClient.memos.list(input),
  });
}
 
export function useInfiniteMemoList(apiClient: ApiClient, input: Omit<ListMemosInput, "cursor"> = {}) {
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

export function useReviewRandomMemo(apiClient: ApiClient) {
  return useQuery({
    queryKey: [...queryKeys.memos, "review", "random"],
    queryFn: () => apiClient.review.random(),
  });
}
