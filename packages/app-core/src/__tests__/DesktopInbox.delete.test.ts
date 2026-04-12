import { describe, expect, it, vi } from "vitest";

import {
  cancelMemoDeleteConfirmation,
  confirmMemoDelete,
  openMemoDeleteConfirmation,
} from "../screens/memoDeleteState";

describe("DesktopInbox delete state", () => {
  it("opens delete confirmation for the selected memo", () => {
    expect(openMemoDeleteConfirmation("memo-1")).toEqual({
      pendingDeleteMemoId: "memo-1",
      deleteErrorMessage: null,
    });
  });

  it("keeps confirmation open while delete is pending", () => {
    expect(
      cancelMemoDeleteConfirmation(
        {
          pendingDeleteMemoId: "memo-1",
          deleteErrorMessage: null,
        },
        true,
      ),
    ).toEqual({
      pendingDeleteMemoId: "memo-1",
      deleteErrorMessage: null,
    });
  });

  it("clears confirmation when delete is cancelled", () => {
    expect(
      cancelMemoDeleteConfirmation(
        {
          pendingDeleteMemoId: "memo-1",
          deleteErrorMessage: null,
        },
        false,
      ),
    ).toEqual({
      pendingDeleteMemoId: null,
      deleteErrorMessage: null,
    });
  });

  it("clears delete state after a successful delete", async () => {
    const removeMemo = vi.fn().mockResolvedValue(undefined);

    await expect(confirmMemoDelete("memo-1", removeMemo)).resolves.toEqual({
      pendingDeleteMemoId: null,
      deleteErrorMessage: null,
    });
    expect(removeMemo).toHaveBeenCalledWith("memo-1");
  });

  it("returns inline error message when delete fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const removeMemo = vi.fn().mockRejectedValue(new Error("boom"));

    await expect(confirmMemoDelete("memo-1", removeMemo)).resolves.toEqual({
      pendingDeleteMemoId: null,
      deleteErrorMessage: "删除失败，请稍后重试",
    });
    expect(removeMemo).toHaveBeenCalledWith("memo-1");
    consoleErrorSpy.mockRestore();
  });
});
