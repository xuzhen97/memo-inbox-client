export interface MemoDeleteState {
  pendingDeleteMemoId: string | null;
  deleteErrorMessage: string | null;
}

export function openMemoDeleteConfirmation(memoId: string): MemoDeleteState {
  return {
    pendingDeleteMemoId: memoId,
    deleteErrorMessage: null,
  };
}

export function cancelMemoDeleteConfirmation(state: MemoDeleteState, isRemoving: boolean): MemoDeleteState {
  if (isRemoving) {
    return state;
  }

  return {
    ...state,
    pendingDeleteMemoId: null,
  };
}

export async function confirmMemoDelete(
  memoId: string,
  removeMemo: (memoId: string) => Promise<unknown>,
): Promise<MemoDeleteState> {
  try {
    await removeMemo(memoId);
    return {
      pendingDeleteMemoId: null,
      deleteErrorMessage: null,
    };
  } catch (error) {
    console.error(error);
    return {
      pendingDeleteMemoId: null,
      deleteErrorMessage: "删除失败，请稍后重试",
    };
  }
}
