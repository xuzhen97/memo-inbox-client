import * as React from "react";
import { Loader2, RefreshCcw, X } from "lucide-react";
import { useReviewRandomMemo } from "@memo-inbox/api-client";
import { useApiClient } from "../api/ApiClientContext";
import { useAppConfig } from "../config/AppConfigContext";
import { appNavigateEvent } from "../router/createAppRouter";
import { formatDateTime } from "../utils/formatDateTime";

function resolveAttachmentUrl(baseUrl: string, url?: string) {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("blob:")) return url;
  return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
}

function normalizeAttachmentUrl(attachment: unknown) {
  if (typeof attachment === "string") return attachment;
  if (attachment && typeof attachment === "object" && "url" in attachment) {
    const url = (attachment as { url?: unknown }).url;
    return typeof url === "string" ? url : "";
  }
  return "";
}

function navigateToInbox() {
  if (window.location.pathname !== "/") {
    window.history.pushState({}, "", "/");
    window.dispatchEvent(new Event(appNavigateEvent));
  }
}

export function MobileReview() {
  const apiClient = useApiClient();
  const { apiUrl } = useAppConfig();
  const { data, isLoading, isFetching, error, refetch } = useReviewRandomMemo(apiClient);

  const [lightboxState, setLightboxState] = React.useState<{
    attachmentUrls: string[];
    activeIndex: number;
  } | null>(null);

  const openLightbox = (attachmentUrls: string[], activeIndex: number) => {
    setLightboxState({ attachmentUrls, activeIndex });
  };
  const closeLightbox = () => setLightboxState(null);
  const showPreviousLightboxImage = () => {
    setLightboxState((current) => {
      if (!current) return null;
      return {
        ...current,
        activeIndex: current.activeIndex === 0 ? current.attachmentUrls.length - 1 : current.activeIndex - 1
      };
    });
  };
  const showNextLightboxImage = () => {
    setLightboxState((current) => {
      if (!current) return null;
      return {
        ...current,
        activeIndex: current.activeIndex === current.attachmentUrls.length - 1 ? 0 : current.activeIndex + 1
      };
    });
  };

  const touchStartX = React.useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const distance = touchStartX.current - e.changedTouches[0].clientX;
    if (distance > 40) showNextLightboxImage();
    else if (distance < -40) showPreviousLightboxImage();
    touchStartX.current = null;
  };

  return (
    <div className="flex flex-col min-h-full px-5 pt-4 pb-12 w-full max-w-lg mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-serif italic font-bold text-primary">重温旧记忆</h2>
        <p className="text-[11px] text-on-surface-variant/40 tracking-widest uppercase mt-1">Review</p>
      </div>

      {isLoading ? (
        <div className="bg-[#FAEED6] rounded-[24px] p-6 shadow-sm flex items-center justify-center min-h-[150px]">
          <Loader2 size={24} className="animate-spin text-[#4A433A]/50" />
        </div>
      ) : error && (error as { code?: string }).code === "MEMO_NOT_FOUND" ? (
        <div className="bg-[#FAEED6] rounded-[24px] p-6 shadow-sm relative overflow-hidden text-center">
          <h3 className="text-lg font-bold text-[#1F1B12] mb-3">还没有可回顾的记忆</h3>
          <p className="text-[13px] text-[#4A433A] leading-relaxed mb-6">
            先回到主页记下一些片段，再回来重温它们。
          </p>
          <button
            onClick={navigateToInbox}
            className="bg-[#111F1C] text-white text-xs font-bold px-6 py-3 rounded-[14px]"
          >
            回到收件箱
          </button>
        </div>
      ) : error ? (
        <div className="bg-red-50 rounded-[24px] p-6 shadow-sm relative overflow-hidden text-center border border-red-100">
          <h3 className="text-lg font-bold text-red-900 mb-3">未取到旧记忆</h3>
          <p className="text-[13px] text-red-700/80 leading-relaxed mb-6">
            请稍后再试一次，或回到主页继续浏览。
          </p>
          <button
            onClick={() => void refetch()}
            className="bg-red-900 text-white text-xs font-bold px-6 py-3 rounded-[14px]"
          >
            重试
          </button>
        </div>
      ) : data ? (
        <>
          <div className="bg-[#FAEED6] rounded-[24px] p-6 mb-6 shadow-sm relative overflow-hidden">
            <h3 className="text-[10px] font-bold text-[#1F1B12]/40 tracking-widest uppercase mb-4">
              {formatDateTime(data.createdAt)} · 旧记录
            </h3>
            
            <p className="text-[16px] text-[#1F1B12] leading-[1.8] whitespace-pre-wrap font-sans mb-5">
              {data.content}
            </p>

            {data.attachments && data.attachments.length > 0 && (() => {
              const attachmentUrls = data.attachments.map(normalizeAttachmentUrl).filter(Boolean);
              if (attachmentUrls.length === 0) return null;
              
              const previewUrls = attachmentUrls.slice(0, 4);
              const remainingCount = attachmentUrls.length - previewUrls.length;
              const gridColsClass = previewUrls.length === 1 ? "grid-cols-1" : "grid-cols-2";

              return (
                <div className="mb-5">
                  <div className={`grid ${gridColsClass} max-w-[280px] gap-2`}>
                    {previewUrls.map((url, index) => {
                      const isLastPreview = index === previewUrls.length - 1;
                      const showRemainingOverlay = remainingCount > 0 && isLastPreview;
                      return (
                        <button
                          key={`${data.memoId}-${index}`}
                          type="button"
                          className="group relative aspect-[4/3] overflow-hidden rounded-[16px] shadow-sm bg-black/5"
                          onClick={() => openLightbox(attachmentUrls, index)}
                        >
                          <img
                            src={resolveAttachmentUrl(apiUrl, url)}
                            alt="attachment"
                            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                          />
                          {showRemainingOverlay && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-lg font-bold text-white">
                              +{remainingCount}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {data.tags && data.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-[10px] bg-white/40 px-3 py-1 text-[10px] font-bold text-[#4A433A]"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex px-1">
             <button
                type="button"
                className="bg-[#051F14] text-white font-[500] px-6 py-3.5 rounded-[16px] text-[14px] tracking-wide flex items-center justify-center gap-2 hover:bg-black transition-colors disabled:opacity-50 shadow-md shadow-black/5 w-full"
                onClick={() => void refetch()}
                disabled={isFetching}
              >
                {isFetching ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
                {isFetching ? "取回中..." : "换一条记忆"}
            </button>
          </div>
        </>
      ) : null}

      {lightboxState && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 px-4 py-10 touch-none"
          onClick={closeLightbox}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <button
            type="button"
            className="absolute right-4 top-10 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
            onClick={closeLightbox}
          >
            <X size={18} />
          </button>
          {lightboxState.attachmentUrls.length > 1 && (
            <>
              <button
                type="button"
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
                onClick={(e) => { e.stopPropagation(); showPreviousLightboxImage(); }}
              >
                {"<"}
              </button>
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
                onClick={(e) => { e.stopPropagation(); showNextLightboxImage(); }}
              >
                {">"}
              </button>
            </>
          )}
          <img
            src={resolveAttachmentUrl(apiUrl, lightboxState.attachmentUrls[lightboxState.activeIndex])}
            alt="Lightbox Preview"
            className="max-h-full max-w-full object-contain pointer-events-none select-none"
          />
        </div>
      )}
    </div>
  );
}
