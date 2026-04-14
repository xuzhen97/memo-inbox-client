import * as React from "react";
import { Search, Image as ImageIcon, Tag as TagIcon, Link as LinkIcon, CheckCircle2, Loader2, X, Plus, Eye } from "lucide-react";
import { useApiClient } from "../api/ApiClientContext";
import { useAppConfig } from "../config/AppConfigContext";
import { useMemoSearch, useCreateMemo, useRemoveMemo, useInfiniteMemoSearch } from "@memo-inbox/api-client";
import type { MemoDto } from "@memo-inbox/shared-types";
import { getMobileTimeLabel, getRelativeDayLabel } from "../utils/mobileTimeFormat";
import { appNavigateEvent } from "../router/createAppRouter";
import { cancelMemoDeleteConfirmation, confirmMemoDelete, openMemoDeleteConfirmation } from "./memoDeleteState";

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

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export function MobileInbox() {
  const { apiUrl } = useAppConfig();
  const [memoText, setMemoText] = React.useState("");
  const [memoTags, setMemoTags] = React.useState<string[]>([]);
  const [tagInputValue, setTagInputValue] = React.useState("");
  const [showTagInput, setShowTagInput] = React.useState(false);
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = React.useState<string[]>([]);
  
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedTag, setSelectedTag] = React.useState<string | undefined>();
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const toggleTag = (tag: string) => {
    if (selectedTag === tag) {
      setSelectedTag(undefined);
    } else {
      setSelectedTag(tag);
    }
  };
  
  const [lightboxState, setLightboxState] = React.useState<{
    memoId: string;
    attachmentUrls: string[];
    activeIndex: number;
  } | null>(null);
  
  const tagInputRef = React.useRef<HTMLInputElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const apiClient = useApiClient();
  
  const { data: infiniteSearchData, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } = useInfiniteMemoSearch(apiClient, {
    q: debouncedSearchQuery || undefined,
    tag: selectedTag,
    limit: 20
  });

  const { mutateAsync: createMemo, isPending: isCreating } = useCreateMemo(apiClient);
  const { mutateAsync: removeMemo, isPending: isRemoving } = useRemoveMemo(apiClient);

  const [pendingDeleteMemoId, setPendingDeleteMemoId] = React.useState<string | null>(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = React.useState<string | null>(null);

  const applyDeleteState = React.useCallback((state: { pendingDeleteMemoId: string | null; deleteErrorMessage: string | null; }) => {
    setPendingDeleteMemoId(state.pendingDeleteMemoId);
    setDeleteErrorMessage(state.deleteErrorMessage);
  }, []);

  const handleDeleteClick = (memoId: string) => {
    applyDeleteState(openMemoDeleteConfirmation(memoId));
  };
  const handleDeleteCancel = () => {
    applyDeleteState(cancelMemoDeleteConfirmation({ pendingDeleteMemoId, deleteErrorMessage }, isRemoving));
  };
  const handleDeleteConfirm = async (memoId: string) => {
    applyDeleteState(await confirmMemoDelete(memoId, removeMemo));
  };
  const handleEditClick = (memoId: string) => {
    window.history.pushState({}, "", `/memos/${encodeURIComponent(memoId)}/edit`);
    window.dispatchEvent(new Event(appNavigateEvent));
  };

  // Auto focus behavior for tag input
  React.useEffect(() => {
    if (showTagInput && tagInputRef.current) {
      tagInputRef.current.focus();
    }
  }, [showTagInput]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setSelectedFiles(prev => [...prev, ...files]);
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setImagePreviews(prev => [...prev, ...newPreviews]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => {
      const p = [...prev];
      URL.revokeObjectURL(p[index]); // Free memory
      p.splice(index, 1);
      return p;
    });
  };

  const addTag = (raw: string) => {
    const tag = raw.replace(/^#+/, '').trim();
    if (!tag) return;
    setMemoTags(prev => prev.includes(tag) ? prev : [...prev, tag]);
    setTagInputValue("");
  };

  const handleSend = async () => {
    if (!memoText.trim() && selectedFiles.length === 0) return;
    try {
      await createMemo({
        content: memoText,
        tags: memoTags.length > 0 ? memoTags : undefined,
        files: selectedFiles.length > 0 ? selectedFiles : undefined
      });
      setMemoText("");
      setMemoTags([]);
      setTagInputValue("");
      setShowTagInput(false);
      setSelectedFiles([]);
      setImagePreviews([]);
      // You could optionally show a toast here "已写入记忆"
    } catch (e) {
      console.error(e);
      alert("Failed to send memo");
    }
  };

  const openLightbox = (memoId: string, attachmentUrls: string[], activeIndex: number) => {
    setLightboxState({ memoId, attachmentUrls, activeIndex });
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

  // Intersection Observer for Infinite Scroll
  const loadMoreRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) fetchNextPage();
      }, { threshold: 0.1 });

    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const touchStartX = React.useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const distance = touchStartX.current - touchEndX;
    if (distance > 40) {
      showNextLightboxImage();
    } else if (distance < -40) {
      showPreviousLightboxImage();
    }
    touchStartX.current = null;
  };

  let memos: MemoDto[] = infiniteSearchData?.pages.flatMap(page => page.items) || [];
  
  // Custom grouping logic for mobile
  let lastRelativeDay = "";

  return (
    <div className="flex flex-col min-h-full px-5 pt-4 pb-12 w-full max-w-lg mx-auto">
      
      {/* Search Input */}
      <div className="flex items-center bg-[#FCFAFA] md:bg-surface-container-high/50 border border-outline-variant/10 rounded-[16px] px-4 py-2.5 mb-6 transition-shadow focus-within:ring-2 focus-within:ring-primary/20">
        <Search size={16} className="text-on-surface-variant/40 mr-2 shrink-0" />
        <input
          type="text"
          placeholder="搜索记忆或输入 #标签 回车..."
          className="bg-transparent border-none outline-none text-[13px] w-full text-primary placeholder:text-on-surface-variant/30"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              const match = searchQuery.match(/(?:^|\s)#([^\s#]+)/);
              if (match) {
                e.preventDefault();
                setSelectedTag(match[1]);
                setSearchQuery(searchQuery.replace(match[0], "").trim());
              }
            } else if (e.key === "Backspace" && searchQuery === "" && selectedTag) {
              setSelectedTag(undefined);
            }
          }}
        />
        {selectedTag && (
          <div className="ml-2 flex shrink-0 items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-primary">
            <span className="text-[11px] font-bold">#{selectedTag}</span>
            <X size={12} className="cursor-pointer opacity-70 hover:opacity-100" onClick={() => setSelectedTag(undefined)} />
          </div>
        )}
        {searchQuery && !selectedTag && (
          <button onClick={() => setSearchQuery("")} className="shrink-0 p-1 bg-surface-container rounded-full text-on-surface-variant/60 ml-2">
            <X size={12} />
          </button>
        )}
      </div>

      {/* Editor Area */}
      <div className="bg-white rounded-[24px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] mb-8">
        <textarea
          placeholder="记下此刻的想法..."
          className="w-full bg-transparent border-none resize-none focus:outline-none min-h-[80px] text-[15px] font-sans placeholder:text-on-surface-variant/30 text-primary leading-relaxed"
          value={memoText}
          onChange={(e) => setMemoText(e.target.value)}
          disabled={isCreating}
        />

        {/* Selected Images */}
        {imagePreviews.length > 0 && (
          <div className="flex gap-3 flex-wrap mt-2 mb-4">
            {imagePreviews.map((preview, idx) => (
              <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-outline-variant/20">
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => removeFile(idx)}
                  className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 disabled:opacity-50"
                  disabled={isCreating}
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Selected Tags */}
        {(memoTags.length > 0 || showTagInput) && (
          <div className="flex flex-wrap gap-2 mb-4 items-center">
            {memoTags.map(tag => (
              <span key={tag} className="flex items-center gap-1 bg-surface-container-low text-primary px-3 py-1 rounded-full text-xs font-bold">
                #{tag}
                <button onClick={() => setMemoTags(tags => tags.filter(t => t !== tag))} className="opacity-60 hover:opacity-100 ml-1">
                  <X size={11} />
                </button>
              </span>
            ))}
            {showTagInput && (
              <input
                ref={tagInputRef}
                type="text"
                value={tagInputValue}
                onChange={(e) => setTagInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
                    e.preventDefault();
                    addTag(tagInputValue);
                  } else if (e.key === 'Backspace' && tagInputValue === '') {
                    setMemoTags(prev => prev.slice(0, -1));
                  }
                }}
                onBlur={() => {
                  if (tagInputValue) addTag(tagInputValue);
                  if (memoTags.length === 0 && !tagInputValue) setShowTagInput(false);
                }}
                placeholder="标签..."
                className="bg-transparent border-none outline-none text-xs text-primary min-w-[80px]"
              />
            )}
          </div>
        )}

        <div className="flex justify-between items-center mt-2">
          <div className="flex gap-4 text-on-surface-variant/40 ml-1">
            <input
              type="file"
              id="mobile-memo-image-upload"
              className="hidden"
              accept="image/*"
              multiple
              ref={fileInputRef}
              onChange={handleFileSelect}
              disabled={isCreating}
            />
            <label htmlFor="mobile-memo-image-upload" className="cursor-pointer hover:text-primary transition-colors flex items-center">
              <ImageIcon size={18} />
            </label>
            <TagIcon
              size={18}
              className={`cursor-pointer transition-colors ${showTagInput || memoTags.length > 0 ? 'text-primary' : 'hover:text-primary'}`}
              onClick={() => setShowTagInput(true)}
            />
            <Eye size={18} className="cursor-pointer hover:text-primary transition-colors" />
          </div>
          <button
            className="bg-[#051F14] text-white font-[500] px-5 py-2.5 rounded-[12px] text-[13px] tracking-wide flex items-center gap-2 hover:bg-black transition-colors disabled:opacity-50"
            onClick={handleSend}
            disabled={isCreating || (!memoText.trim() && selectedFiles.length === 0)}
          >
            {isCreating && <Loader2 size={12} className="animate-spin" />}
            记录这条想法
          </button>
        </div>
      </div>

      {/* Timeline Feed */}
      <div className="flex flex-col gap-10">
        {deleteErrorMessage && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs -mb-5">{deleteErrorMessage}</div>
        )}
        {isLoading ? (
          <div className="flex justify-center py-10 opacity-50">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        ) : memos.map((memo, idx) => {
          let timeLabelStr = getMobileTimeLabel(memo.createdAt);
          const currentRelativeDay = getRelativeDayLabel(memo.createdAt);
          
          if (currentRelativeDay !== "今日") {
            // For yesterday, week days etc. Replace timeLabel with relative day if it's the first one, or omit maybe? 
            // Based on design, it just prints "昨日", "周三", etc.
            // Wait, does it print "周三" for EVERY memo that day? The prototype looks like it prints the label on the left.
            if (currentRelativeDay !== lastRelativeDay) {
               timeLabelStr = currentRelativeDay;
               lastRelativeDay = currentRelativeDay;
            } else {
               timeLabelStr = ""; // Hide if it's the same day to make it cleaner? But design shows "昨日" then under it "周三"? Let's just output it if needed or empty space.
               // Actually prototype shows "昨日", and then a big gap, and then "周三" for the next group. For simplicity I'll print the relative day for the first item of that day.
            }
          } else {
             // It's today, show time
             timeLabelStr = getMobileTimeLabel(memo.createdAt);
             lastRelativeDay = "今日";
          }

          const hasImages = memo.attachments && memo.attachments.length > 0;
          
          return (
            <div key={memo.memoId} className="flex gap-5 relative">
              {/* Left Column - Time/Date Label */}
              <div className="w-[52px] flex-shrink-0 text-[11px] font-bold text-on-surface-variant/40 tracking-wider pt-1 uppercase text-right">
                {timeLabelStr}
              </div>

              {/* Right Column - Content */}
              <div className="flex-1 flex flex-col pt-0.5">
                <p className="text-[15px] leading-[1.8] text-[#2C2C2C] mb-3 whitespace-pre-wrap font-sans">
                  {memo.content}
                </p>

                {memo.attachments && memo.attachments.length > 0 && (() => {
                  const attachmentUrls = memo.attachments.map(normalizeAttachmentUrl).filter(Boolean);
                  if (attachmentUrls.length === 0) return null;
                  
                  const previewUrls = attachmentUrls.slice(0, 4);
                  const remainingCount = attachmentUrls.length - previewUrls.length;
                  const gridColsClass = previewUrls.length === 1 ? "grid-cols-1" : "grid-cols-2";

                  return (
                    <div className="mb-4">
                      <div className={`grid ${gridColsClass} max-w-[280px] gap-2`}>
                        {previewUrls.map((url, index) => {
                          const isLastPreview = index === previewUrls.length - 1;
                          const showRemainingOverlay = remainingCount > 0 && isLastPreview;
                          return (
                            <button
                              key={`${memo.memoId}-${index}`}
                              type="button"
                              className="group relative aspect-[4/3] overflow-hidden rounded-[16px] shadow-sm bg-surface-container"
                              onClick={() => openLightbox(memo.memoId, attachmentUrls, index)}
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

                {memo.tags && memo.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {memo.tags.map(tag => (
                      <button 
                        key={tag} 
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1 rounded-[10px] text-[10px] font-bold tracking-wide transition-colors ${
                          selectedTag === tag 
                            ? "bg-primary text-white" 
                            : "bg-[#F2F2F2] text-[#6B6B6B]"
                        }`}
                      >
                         #{tag}
                      </button>
                    ))}
                  </div>
                )}
                
                <div className="flex justify-end items-center gap-3 mt-1">
                  {pendingDeleteMemoId === memo.memoId ? (
                     <div className="flex items-center gap-2">
                        <span className="text-[10px] text-red-500 mr-1">移入回收站?</span>
                        <button onClick={() => void handleDeleteConfirm(memo.memoId)} disabled={isRemoving} className="text-[11px] bg-red-100 text-red-600 px-3 py-1 rounded-full font-bold">确定</button>
                        <button onClick={handleDeleteCancel} disabled={isRemoving} className="text-[11px] bg-surface-container text-on-surface-variant px-3 py-1 rounded-full font-bold">取消</button>
                     </div>
                  ) : (
                    <>
                      <button onClick={() => handleEditClick(memo.memoId)} className="text-[11px] text-on-surface-variant/40 hover:text-primary transition-colors font-bold">编辑</button>
                      <button onClick={() => handleDeleteClick(memo.memoId)} className="text-[11px] text-on-surface-variant/40 hover:text-red-500 transition-colors font-bold">删除</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {hasNextPage && (
          <div ref={loadMoreRef} className="flex justify-center py-6 h-20">
            {isFetchingNextPage ? (
              <Loader2 size={18} className="animate-spin text-primary/40" />
            ) : <div className="h-4 w-4" />}
          </div>
        )}
      </div>

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
