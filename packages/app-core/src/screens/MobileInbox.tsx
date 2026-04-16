import * as React from "react";
import { Search, Image as ImageIcon, Tag as TagIcon, Link as LinkIcon, CheckCircle2, Loader2, X, Plus, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { useApiClient } from "../api/ApiClientContext";
import { useAppConfig } from "../config/AppConfigContext";
import { useCreateMemo, useRemoveMemo, useInfiniteMemoList } from "@memo-inbox/api-client";
import type { MemoDto } from "@memo-inbox/shared-types";
import { formatDateTime } from "../utils/formatDateTime";
import { appNavigateEvent } from "../router/createAppRouter";
import { cancelMemoDeleteConfirmation, confirmMemoDelete, openMemoDeleteConfirmation } from "./memoDeleteState";
import { useSettings } from "../config/SettingsContext";

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
  const { settings, updateSettings } = useSettings();
  const [memoText, setMemoText] = React.useState("");
  const [memoTags, setMemoTags] = React.useState<string[]>([]);
  const [tagInputValue, setTagInputValue] = React.useState("");
  const [showTagInput, setShowTagInput] = React.useState(false);
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = React.useState<string[]>([]);
  const revokePreviewUrls = React.useCallback((urls: string[]) => {
    urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);
  const imagePreviewsRef = React.useRef<string[]>([]);
  
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedTag, setSelectedTag] = React.useState<string | undefined>();
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [followTagInputValue, setFollowTagInputValue] = React.useState("");
  const [showFollowTagInput, setShowFollowTagInput] = React.useState(false);
  const [isFollowTagSectionExpanded, setIsFollowTagSectionExpanded] = React.useState(false);
  const [pullRefreshDistance, setPullRefreshDistance] = React.useState(0);
  const [isPullRefreshing, setIsPullRefreshing] = React.useState(false);
  const [pullRefreshHint, setPullRefreshHint] = React.useState<"pull" | "release" | "refreshing" | "done">("pull");

  const followedTags = settings.followedTags || [];

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
  const [lightboxTransform, setLightboxTransform] = React.useState({
    scale: 1,
    translateX: 0,
    translateY: 0,
  });
  
  const tagInputRef = React.useRef<HTMLInputElement>(null);
  const followTagInputRef = React.useRef<HTMLInputElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const pullStartYRef = React.useRef<number | null>(null);
  const lastTapRef = React.useRef<number>(0);
  const lightboxStartRef = React.useRef<{ x: number; y: number; distance: number | null } | null>(null);

  const apiClient = useApiClient();
  
  const { data: infiniteSearchData, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage, refetch } = useInfiniteMemoList(apiClient, {
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

  React.useEffect(() => {
    if (showFollowTagInput && followTagInputRef.current) {
      followTagInputRef.current.focus();
    }
  }, [showFollowTagInput]);

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

  const handleAddFollowTag = async (raw: string) => {
    const tag = raw.replace(/^#+/, "").trim();
    if (!tag || followedTags.includes(tag)) {
      setFollowTagInputValue("");
      setShowFollowTagInput(false);
      return;
    }

    await updateSettings({
      followedTags: [...followedTags, tag],
    });
    setFollowTagInputValue("");
    setShowFollowTagInput(false);
    setIsFollowTagSectionExpanded(true);
  };

  const handleRemoveFollowTag = async (tag: string) => {
    await updateSettings({
      followedTags: followedTags.filter((item) => item !== tag),
    });

    if (selectedTag === tag) {
      setSelectedTag(undefined);
    }
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
      revokePreviewUrls(imagePreviews);
      setImagePreviews([]);
      // You could optionally show a toast here "已写入记忆"
    } catch (e) {
      console.error(e);
      alert("Failed to send memo");
    }
  };

  const openLightbox = (memoId: string, attachmentUrls: string[], activeIndex: number) => {
    setLightboxState({ memoId, attachmentUrls, activeIndex });
    setLightboxTransform({ scale: 1, translateX: 0, translateY: 0 });
  };
  const closeLightbox = () => {
    setLightboxState(null);
    setLightboxTransform({ scale: 1, translateX: 0, translateY: 0 });
  };
  const showPreviousLightboxImage = () => {
    setLightboxState((current) => {
      if (!current) return null;
      return {
        ...current,
        activeIndex: current.activeIndex === 0 ? current.attachmentUrls.length - 1 : current.activeIndex - 1
      }
    });
    setLightboxTransform({ scale: 1, translateX: 0, translateY: 0 });
  };
  const showNextLightboxImage = () => {
    setLightboxState((current) => {
      if (!current) return null;
      return {
        ...current,
        activeIndex: current.activeIndex === current.attachmentUrls.length - 1 ? 0 : current.activeIndex + 1
      }
    });
    setLightboxTransform({ scale: 1, translateX: 0, translateY: 0 });
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

  React.useEffect(() => {
    imagePreviewsRef.current = imagePreviews;
  }, [imagePreviews]);

  React.useEffect(() => {
    return () => {
      revokePreviewUrls(imagePreviewsRef.current);
    };
  }, [revokePreviewUrls]);

  const touchStartX = React.useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (lightboxState) {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lightboxStartRef.current = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
          distance: Math.hypot(dx, dy),
        };
        return;
      }

      lightboxStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        distance: null,
      };
      touchStartX.current = e.touches[0].clientX;
      return;
    }

    const container = contentRef.current;
    if (!container || container.scrollTop > 0 || isPullRefreshing) {
      pullStartYRef.current = null;
      return;
    }

    pullStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (lightboxState) {
      const lightboxStart = lightboxStartRef.current;

      if (e.touches.length === 2 && lightboxStart?.distance) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const distance = Math.hypot(dx, dy);
        const nextScale = Math.min(3, Math.max(1, distance / lightboxStart.distance));
        setLightboxTransform((current) => ({
          ...current,
          scale: nextScale,
        }));
        return;
      }

      if (lightboxTransform.scale > 1 && lightboxStart && e.touches.length === 1) {
        setLightboxTransform((current) => ({
          ...current,
          translateX: current.translateX + (e.touches[0].clientX - lightboxStart.x),
          translateY: current.translateY + (e.touches[0].clientY - lightboxStart.y),
        }));
        lightboxStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          distance: null,
        };
        return;
      }

      return;
    }

    if (pullStartYRef.current === null) {
      return;
    }

    const distance = Math.max(0, e.touches[0].clientY - pullStartYRef.current);
    const capped = Math.min(distance, 120);
    if (capped > 0) {
      setPullRefreshDistance(capped);
      setPullRefreshHint(capped >= 72 ? "release" : "pull");
    }
  };

  const triggerPullRefresh = async () => {
    if (isPullRefreshing) {
      return;
    }

    setIsPullRefreshing(true);
    setPullRefreshHint("refreshing");
    try {
      await refetch();
      setPullRefreshHint("done");
    } finally {
      setTimeout(() => {
        setIsPullRefreshing(false);
        setPullRefreshDistance(0);
        setPullRefreshHint("pull");
      }, 400);
    }
  };

  const handleTouchEnd = async (e: React.TouchEvent) => {
    if (lightboxState) {
      if (touchStartX.current !== null && lightboxTransform.scale === 1) {
        const touchEndX = e.changedTouches[0].clientX;
        const distance = touchStartX.current - touchEndX;
        if (distance > 40) {
          showNextLightboxImage();
        } else if (distance < -40) {
          showPreviousLightboxImage();
        }
      }

      touchStartX.current = null;
      lightboxStartRef.current = null;
      return;
    }

    if (pullStartYRef.current !== null && pullRefreshDistance >= 72) {
      pullStartYRef.current = null;
      await triggerPullRefresh();
      return;
    }

    pullStartYRef.current = null;
    setPullRefreshDistance(0);
    setPullRefreshHint("pull");
  };

  const handleLightboxDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 280) {
      setLightboxTransform((current) => (
        current.scale > 1
          ? { scale: 1, translateX: 0, translateY: 0 }
          : { scale: 2, translateX: 0, translateY: 0 }
      ));
    }
    lastTapRef.current = now;
  };

  let memos: MemoDto[] = infiniteSearchData?.pages.flatMap(page => page.items) || [];
  
  // Custom grouping logic for mobile
  return (
    <div
      ref={contentRef}
      className="flex flex-col min-h-full px-5 pt-4 pb-12 w-full max-w-lg mx-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      
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

      <div className="mb-5">
        <div
          className="overflow-hidden transition-[height,opacity] duration-200"
          style={{ height: pullRefreshDistance > 0 || isPullRefreshing ? 44 : 0, opacity: pullRefreshDistance > 0 || isPullRefreshing ? 1 : 0 }}
        >
          <div className="flex h-11 items-center justify-center text-[11px] font-bold text-on-surface-variant/60">
            {pullRefreshHint === "release" ? "松手刷新" : pullRefreshHint === "refreshing" ? "正在刷新..." : pullRefreshHint === "done" ? "已刷新" : "下拉刷新"}
          </div>
        </div>

      </div>

      {/* Editor Area */}
      <div className="bg-white rounded-[24px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] mb-6">
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

      <div className="mb-8 rounded-[20px] border border-outline-variant/15 bg-[#FCFAFA] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold tracking-[0.15em] text-on-surface-variant/35 uppercase">关注标签</div>
            {!isFollowTagSectionExpanded && selectedTag && (
              <div className="mt-1 text-[12px] font-medium text-primary">当前：#{selectedTag}</div>
            )}
          </div>
          <button
            type="button"
            aria-label={isFollowTagSectionExpanded ? "收起关注标签" : "展开关注标签"}
            className="rounded-full p-1.5 text-on-surface-variant/45 transition-colors hover:text-on-surface-variant/70"
            onClick={() => {
              setIsFollowTagSectionExpanded((current) => {
                const next = !current;
                if (!next) {
                  setShowFollowTagInput(false);
                  setFollowTagInputValue("");
                }
                return next;
              });
            }}
          >
            {isFollowTagSectionExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {isFollowTagSectionExpanded ? (
          <div className="mt-3">
            <div className="flex flex-wrap gap-2">
              {followedTags.map((tag) => (
                <div
                  key={tag}
                  className={`group relative flex items-center rounded-full px-3 py-1.5 pr-8 text-[11px] font-bold ${
                    selectedTag === tag ? "bg-primary text-white" : "bg-white text-primary border border-outline-variant/10"
                  }`}
                >
                  <button type="button" onClick={() => toggleTag(tag)}>
                    #{tag}
                  </button>
                  <button
                    type="button"
                    aria-label={`移除关注标签 ${tag}`}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 ${selectedTag === tag ? "text-white/80" : "text-on-surface-variant/55"}`}
                    onClick={() => void handleRemoveFollowTag(tag)}
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}

              <button
                type="button"
                aria-label="添加关注标签"
                className="inline-flex items-center justify-center rounded-full border border-outline-variant/15 bg-white px-3 py-1.5 text-on-surface-variant/55 transition-colors hover:text-primary"
                onClick={() => setShowFollowTagInput(true)}
              >
                <Plus size={12} />
              </button>

              {showFollowTagInput && (
                <input
                  ref={followTagInputRef}
                  type="text"
                  value={followTagInputValue}
                  onChange={(e) => setFollowTagInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " " || e.key === ",") {
                      e.preventDefault();
                      void handleAddFollowTag(followTagInputValue);
                    }
                  }}
                  onBlur={() => void handleAddFollowTag(followTagInputValue)}
                  placeholder="输入标签"
                  className="min-w-[96px] rounded-full border border-outline-variant/10 bg-white px-3 py-1.5 text-[11px] font-bold text-primary outline-none"
                />
              )}
            </div>
          </div>
        ) : null}
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
          const hasImages = memo.attachments && memo.attachments.length > 0;
          
          return (
            <div key={memo.memoId} data-testid="mobile-memo-row" className="flex flex-col gap-2 relative">
              <div
                data-testid="mobile-memo-datetime"
                className="text-[12px] font-medium text-on-surface-variant/45 tracking-[0.02em]"
              >
                {formatDateTime(memo.createdAt)}
              </div>

              <div data-testid="mobile-memo-content" className="min-w-0 flex flex-col">
                <p data-testid="mobile-memo-text" className="text-[15px] leading-[1.8] text-[#2C2C2C] mb-3 whitespace-pre-wrap break-words [overflow-wrap:anywhere] font-sans">
                  {memo.content}
                </p>

                {memo.attachments && memo.attachments.length > 0 && (() => {
                  const attachmentUrls = memo.attachments.map(normalizeAttachmentUrl).filter(Boolean);
                  if (attachmentUrls.length === 0) return null;
                  
                  const previewUrls = attachmentUrls.slice(0, 4);
                  const remainingCount = attachmentUrls.length - previewUrls.length;
                  const gridColsClass = previewUrls.length === 1 ? "grid-cols-1" : "grid-cols-2";

                  return (
                    <div className="mb-4 max-w-full">
                      <div data-testid="mobile-memo-attachments" className={`grid ${gridColsClass} max-w-full gap-2`}>
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
                  <div data-testid="mobile-memo-tags" className="flex flex-wrap gap-2 mb-2">
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
                
                <div data-testid="mobile-memo-actions" className="flex min-w-0 flex-wrap justify-end items-center gap-3 mt-1">
                  {pendingDeleteMemoId === memo.memoId ? (
                     <div data-testid="mobile-memo-delete-actions" className="flex min-w-0 flex-wrap items-center gap-2">
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
          data-testid="mobile-lightbox"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 px-4 py-10 touch-none"
          onClick={closeLightbox}
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
                aria-label="查看上一张图片"
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
                onClick={(e) => { e.stopPropagation(); showPreviousLightboxImage(); }}
              >
                {"<"}
              </button>
              <button
                type="button"
                aria-label="查看下一张图片"
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
                onClick={(e) => { e.stopPropagation(); showNextLightboxImage(); }}
              >
                {">"}
              </button>
            </>
          )}
          <div className="absolute top-10 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-white">
            {lightboxState.activeIndex + 1} / {lightboxState.attachmentUrls.length}
          </div>
          <img
            key={`${lightboxState.memoId}-${lightboxState.attachmentUrls[lightboxState.activeIndex] ?? lightboxState.activeIndex}`}
            data-testid="mobile-lightbox-image"
            src={resolveAttachmentUrl(apiUrl, lightboxState.attachmentUrls[lightboxState.activeIndex])}
            alt="Lightbox Preview"
            className="max-h-full max-w-full object-contain select-none"
            onClick={(e) => {
              e.stopPropagation();
              handleLightboxDoubleTap();
            }}
            style={{
              transform: `scale(${lightboxTransform.scale}) translate(${lightboxTransform.translateX}px, ${lightboxTransform.translateY}px)`,
              transition: lightboxTransform.scale === 1 ? "transform 120ms ease-out" : "none",
            }}
          />
        </div>
      )}
    </div>
  );
}
