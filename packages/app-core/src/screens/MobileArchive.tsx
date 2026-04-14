import * as React from "react";
import { Loader2, Trash2, RotateCcw, ArchiveX } from "lucide-react";
import { useTrashList, useRestoreMemo, usePurgeMemo } from "@memo-inbox/api-client";
import { useApiClient } from "../api/ApiClientContext";
import { formatDateTime } from "../utils/formatDateTime";

export function MobileArchive() {
  const apiClient = useApiClient();
  const { data: memoPages, isLoading, isFetching, refetch } = useTrashList(apiClient);
  const { mutateAsync: restoreMemo, isPending: isRestoring } = useRestoreMemo(apiClient);
  const { mutateAsync: purgeMemo, isPending: isDeleting } = usePurgeMemo(apiClient);

  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [restoringId, setRestoringId] = React.useState<string | null>(null);

  const memos = memoPages?.items ?? [];
  const totalItems = memos.length;

  const handleRestore = async (id: string) => {
    setRestoringId(id);
    try {
      await restoreMemo(id);
    } catch {
      alert("恢复失败");
    } finally {
      setRestoringId(null);
    }
  };

  const handleHardDelete = async (id: string) => {
    if (!window.confirm("确定要彻底删除这条记录吗？删除后将无法恢复。")) return;
    setDeletingId(id);
    try {
      await purgeMemo(id);
    } catch {
      alert("删除失败");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col min-h-full px-5 pt-4 pb-12 w-full max-w-lg mx-auto">
      <div className="mb-6">
        <div>
          <h2 className="text-2xl font-serif italic font-bold text-primary">回收站</h2>
          <p className="text-[11px] text-on-surface-variant/40 tracking-widest uppercase mt-1">Archive Room</p>
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between text-xs font-medium text-on-surface-variant/60">
        <span>已弃用的片段 ({totalItems})</span>
        <button className="flex items-center gap-1 hover:text-primary transition-colors" onClick={() => void refetch()} disabled={isFetching}>
          <RotateCcw size={12} className={isFetching ? "animate-spin" : ""} /> 刷新
        </button>
      </div>

      <div className="flex flex-col gap-5">
        {isLoading ? (
          <div className="flex justify-center py-10 opacity-50">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        ) : memos.length === 0 ? (
          <div className="bg-[#FCFAFA] rounded-[24px] p-8 text-center border border-outline-variant/5">
            <ArchiveX size={32} className="mx-auto text-on-surface-variant/20 mb-3" />
            <p className="text-sm font-bold text-on-surface-variant/50">回收站是空的</p>
          </div>
        ) : (
          memos.map((memo) => (
            <div key={memo.memoId} className="bg-surface-container-low p-5 rounded-[20px] shadow-sm relative group border border-outline-variant/10">
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-bold text-on-surface-variant/40 font-mono">
                  {formatDateTime(memo.updatedAt || memo.createdAt)}
                </span>
                <span className="bg-red-50 text-red-400 text-[9px] px-2 py-0.5 rounded-full font-bold">
                  已软删除
                </span>
              </div>
              <p className="text-[14px] text-on-surface-variant line-clamp-4 leading-relaxed mb-4">
                {memo.content}
              </p>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/5">
                <button
                  onClick={() => handleRestore(memo.memoId)}
                  disabled={restoringId === memo.memoId}
                  className="text-xs font-bold text-success flex items-center gap-1 transition-colors hover:text-success/70 disabled:opacity-50"
                >
                  {restoringId === memo.memoId ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                  恢复
                </button>
                <button
                  onClick={() => handleHardDelete(memo.memoId)}
                  disabled={deletingId === memo.memoId}
                  className="text-xs font-bold text-red-500 flex items-center gap-1 transition-colors hover:text-red-700 disabled:opacity-50"
                >
                  {deletingId === memo.memoId ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  永久删除
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
 
