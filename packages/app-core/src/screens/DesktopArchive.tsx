import * as React from "react";
import { Archive, Loader2, X, RotateCcw, Trash2, AlertTriangle } from "lucide-react";
import { useApiClient } from "../api/ApiClientContext";
import { useAppConfig } from "../config/AppConfigContext";
import { useTrashList, useRestoreMemo, usePurgeMemo } from "@memo-inbox/api-client";
import type { MemoDto } from "@memo-inbox/shared-types";
import { formatDateTime } from "../utils/formatDateTime";
import { DesktopShellHeader } from "../components/DesktopShellHeader";

function resolveAttachmentUrl(baseUrl: string, url?: string) {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("blob:")) return url;
  return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
}

function normalizeAttachmentUrl(attachment: unknown) {
  if (typeof attachment === "string") {
    return attachment;
  }

  if (attachment && typeof attachment === "object" && "url" in attachment) {
    const url = (attachment as { url?: unknown }).url;
    return typeof url === "string" ? url : "";
  }

  return "";
}

type ConfirmAction = {
  type: "restore" | "purge";
  memoId: string;
} | null;

export function DesktopArchive() {
  const { apiUrl } = useAppConfig();
  const apiClient = useApiClient();

  const { data: trashData, isLoading } = useTrashList(apiClient);
  const { mutateAsync: restoreMemo, isPending: isRestoring } = useRestoreMemo(apiClient);
  const { mutateAsync: purgeMemo, isPending: isPurging } = usePurgeMemo(apiClient);

  const [confirmAction, setConfirmAction] = React.useState<ConfirmAction>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [lightboxState, setLightboxState] = React.useState<{
    memoId: string;
    attachmentUrls: string[];
    activeIndex: number;
  } | null>(null);

  const isBusy = isRestoring || isPurging;

  const memos: MemoDto[] = trashData?.items || [];

  const handleRestore = async (memoId: string) => {
    setErrorMessage(null);
    try {
      await restoreMemo(memoId);
      setConfirmAction(null);
    } catch (error) {
      console.error(error);
      setErrorMessage("恢复失败，请稍后重试");
      setConfirmAction(null);
    }
  };

  const handlePurge = async (memoId: string) => {
    setErrorMessage(null);
    try {
      await purgeMemo(memoId);
      setConfirmAction(null);
    } catch (error) {
      console.error(error);
      setErrorMessage("永久删除失败，请稍后重试");
      setConfirmAction(null);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    if (confirmAction.type === "restore") {
      await handleRestore(confirmAction.memoId);
    } else {
      await handlePurge(confirmAction.memoId);
    }
  };

  const openLightbox = (memoId: string, attachmentUrls: string[], activeIndex: number) => {
    setLightboxState({ memoId, attachmentUrls, activeIndex });
  };

  const closeLightbox = () => {
    setLightboxState(null);
  };

  const showPreviousLightboxImage = () => {
    setLightboxState((current) => {
      if (!current) return null;
      return {
        ...current,
        activeIndex: current.activeIndex === 0
          ? current.attachmentUrls.length - 1
          : current.activeIndex - 1
      };
    });
  };

  const showNextLightboxImage = () => {
    setLightboxState((current) => {
      if (!current) return null;
      return {
        ...current,
        activeIndex: current.activeIndex === current.attachmentUrls.length - 1
          ? 0
          : current.activeIndex + 1
      };
    });
  };

  React.useEffect(() => {
    if (!lightboxState) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeLightbox();
      } else if (event.key === "ArrowLeft") {
        showPreviousLightboxImage();
      } else if (event.key === "ArrowRight") {
        showNextLightboxImage();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [lightboxState]);

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans flex flex-col">
      <DesktopShellHeader activeTab="archive" />

      <main className="flex-1 flex max-w-6xl mx-auto w-full px-6 py-10 gap-14">
        {/* Left Column - Archive Stream */}
        <div className="flex-1 max-w-3xl flex flex-col">
          <div className="mb-8">
            <h1 className="text-4xl font-serif italic tracking-tight font-bold text-primary mb-3">归档记忆</h1>
            <p className="text-on-surface-variant text-[13px] tracking-widest font-sans">已删除的记忆暂存于此，你可以恢复或永久移除。</p>
          </div>

          {/* Archive List */}
          <div className="flex flex-col gap-6">
            {errorMessage && (
              <div className="rounded-[20px] bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                <AlertTriangle size={14} />
                {errorMessage}
              </div>
            )}
            {isLoading ? (
              <div className="flex justify-center py-10 opacity-50">
                <Loader2 size={24} className="animate-spin text-primary" />
              </div>
            ) : memos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-container">
                  <Archive size={28} className="text-on-surface-variant/30" />
                </div>
                <p className="text-on-surface-variant/60 text-sm font-medium">归档为空</p>
                <p className="text-on-surface-variant/40 text-xs mt-1">被删除的记忆会出现在这里</p>
              </div>
            ) : (
              memos.map((memo) => {
                const dateHeader = formatDateTime(memo.createdAt);
                const isConfirmingThis = confirmAction?.memoId === memo.memoId;
                const isActingOnThis = isBusy && isConfirmingThis;

                return (
                  <article
                    key={memo.memoId}
                    className="group bg-surface-container-low p-8 rounded-[24px] border border-outline-variant/5 relative overflow-hidden"
                  >
                    {/* Archived indicator stripe */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-on-surface-variant/10 rounded-l-[24px]" />

                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant/40">
                        {dateHeader} · 已归档
                      </div>

                      {isConfirmingThis ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors disabled:opacity-50 ${
                              confirmAction.type === "purge"
                                ? "bg-red-100 text-red-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                            onClick={() => void handleConfirmAction()}
                            disabled={isActingOnThis}
                            aria-label={confirmAction.type === "purge" ? "确认永久删除" : "确认恢复"}
                          >
                            {isActingOnThis
                              ? "处理中..."
                              : confirmAction.type === "purge"
                                ? "确认永久删除"
                                : "确认恢复"}
                          </button>
                          <button
                            type="button"
                            className="rounded-full bg-surface-container px-3 py-1.5 text-[11px] font-bold text-on-surface-variant transition-colors disabled:opacity-50"
                            onClick={() => setConfirmAction(null)}
                            disabled={isActingOnThis}
                            aria-label="取消"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className="flex items-center gap-1 text-[11px] font-bold text-on-surface-variant/45 opacity-0 transition-all hover:text-emerald-600 group-hover:opacity-100 disabled:opacity-30"
                            onClick={() => setConfirmAction({ type: "restore", memoId: memo.memoId })}
                            disabled={isBusy}
                            aria-label="恢复这条 memo"
                          >
                            <RotateCcw size={12} />
                            恢复
                          </button>
                          <button
                            type="button"
                            className="flex items-center gap-1 text-[11px] font-bold text-on-surface-variant/45 opacity-0 transition-all hover:text-red-700 group-hover:opacity-100 disabled:opacity-30"
                            onClick={() => setConfirmAction({ type: "purge", memoId: memo.memoId })}
                            disabled={isBusy}
                            aria-label="永久删除这条 memo"
                          >
                            <Trash2 size={12} />
                            永久删除
                          </button>
                        </div>
                      )}
                    </div>

                    {isConfirmingThis && confirmAction.type === "purge" && (
                      <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-[12px] text-red-700">
                        <AlertTriangle size={13} />
                        此操作不可撤销，记忆将被永久删除
                      </div>
                    )}

                    {isConfirmingThis && confirmAction.type === "restore" && (
                      <div className="mb-4 text-[12px] text-on-surface-variant">
                        恢复到记忆流？
                      </div>
                    )}

                    <p className="font-sans text-lg text-primary leading-[1.8] whitespace-pre-wrap mb-6">
                      {memo.content}
                    </p>

                    {/* Attachments */}
                    {memo.attachments && memo.attachments.length > 0 && (() => {
                      const attachmentUrls = memo.attachments
                        .map(normalizeAttachmentUrl)
                        .filter(Boolean);

                      if (attachmentUrls.length === 0) return null;

                      const previewUrls = attachmentUrls.slice(0, 4);
                      const remainingCount = attachmentUrls.length - previewUrls.length;

                      return (
                        <div className="mb-6">
                          <div
                            data-testid="memo-attachment-grid"
                            className="grid grid-cols-2 max-w-[360px] gap-3"
                          >
                            {previewUrls.map((url, index) => {
                              const isLastPreview = index === previewUrls.length - 1;
                              const showRemainingOverlay = remainingCount > 0 && isLastPreview;

                              return (
                                <button
                                  key={`${memo.memoId}-${url}-${index}`}
                                  type="button"
                                  data-testid="memo-attachment-thumbnail"
                                  className="group relative aspect-square overflow-hidden rounded-[20px] border border-outline-variant/10 bg-surface"
                                  onClick={() => openLightbox(memo.memoId, attachmentUrls, index)}
                                  aria-label={`查看第 ${index + 1} 张图片`}
                                >
                                  <img
                                    src={resolveAttachmentUrl(apiUrl, url)}
                                    alt={`Memo attachment ${index + 1}`}
                                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                                  />
                                  {showRemainingOverlay ? (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-xl font-bold text-white">
                                      +{remainingCount}
                                    </div>
                                  ) : null}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Tags */}
                    {memo.tags && memo.tags.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {memo.tags.map(tag => (
                          <span
                            key={tag}
                            className="px-3 py-1 bg-surface-container/80 text-on-surface-variant text-[11px] font-bold rounded-lg tracking-wide border border-outline-variant/5"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column - Sidebar Widgets */}
        <div className="w-72 flex flex-col gap-6 pt-[88px] flex-shrink-0">
          {/* Archive Stats */}
          <section className="bg-surface-container-low rounded-[24px] p-7 border border-outline-variant/10">
            <h3 className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant/40 mb-2">归档</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-serif font-bold italic text-primary">
                {isLoading ? "-" : memos.length}
              </span>
              <span className="text-xs text-on-surface-variant font-medium tracking-wide">条已归档记忆</span>
            </div>
          </section>

          {/* Info Card */}
          <section className="bg-surface-container-low rounded-[24px] p-7 border border-outline-variant/10">
            <h3 className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant/40 mb-5">关于归档</h3>
            <div className="flex flex-col gap-4 text-[12px] leading-relaxed text-on-surface-variant/70">
              <div className="flex items-start gap-3">
                <RotateCcw size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                <span><b className="text-primary">恢复</b> — 将记忆放回输入流，可在全部页面查看</span>
              </div>
              <div className="flex items-start gap-3">
                <Trash2 size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                <span><b className="text-primary">永久删除</b> — 不可恢复，记忆将被彻底移除</span>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Lightbox */}
      {lightboxState ? (
        <div
          data-testid="memo-lightbox"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-6 py-10"
          onClick={closeLightbox}
        >
          <button
            type="button"
            aria-label="关闭图片预览"
            className="absolute right-6 top-6 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
            onClick={closeLightbox}
          >
            <X size={18} />
          </button>

          {lightboxState.attachmentUrls.length > 1 ? (
            <>
              <button
                type="button"
                aria-label="查看上一张图片"
                className="absolute left-6 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
                onClick={(event) => {
                  event.stopPropagation();
                  showPreviousLightboxImage();
                }}
              >
                {"<"}
              </button>
              <button
                type="button"
                aria-label="查看下一张图片"
                className="absolute right-6 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
                onClick={(event) => {
                  event.stopPropagation();
                  showNextLightboxImage();
                }}
              >
                {">"}
              </button>
            </>
          ) : null}

          <div
            className="relative flex max-h-full w-full max-w-5xl flex-col items-center gap-4"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              key={`${lightboxState.memoId}-${lightboxState.attachmentUrls[lightboxState.activeIndex] ?? lightboxState.activeIndex}`}
              data-testid="memo-lightbox-image"
              src={resolveAttachmentUrl(
                apiUrl,
                lightboxState.attachmentUrls[lightboxState.activeIndex]
              )}
              alt={`Memo lightbox ${lightboxState.activeIndex + 1}`}
              className="max-h-[80vh] w-auto max-w-full rounded-[24px] object-contain shadow-2xl"
            />
            <div className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white">
              {lightboxState.activeIndex + 1} / {lightboxState.attachmentUrls.length}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
