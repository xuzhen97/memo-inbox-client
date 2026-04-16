import * as React from "react";
import { Search, Image as ImageIcon, Tag as TagIcon, Link as LinkIcon, CheckCircle2, Loader2, X, Plus } from "lucide-react";
import { useApiClient } from "../api/ApiClientContext";
import { useAppConfig } from "../config/AppConfigContext";
import { useCreateMemo, useRemoveMemo, useInfiniteMemoList } from "@memo-inbox/api-client";
import type { MemoDto } from "@memo-inbox/shared-types";
import { appNavigateEvent } from "../router/createAppRouter";
import { formatDateTime } from "../utils/formatDateTime";
import { DesktopShellHeader } from "../components/DesktopShellHeader";
import { useSettings } from "../config/SettingsContext";
import {
  cancelMemoDeleteConfirmation,
  confirmMemoDelete,
  openMemoDeleteConfirmation,
} from "./memoDeleteState";

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

// Hook for debounce
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

export function DesktopInbox() {
  const { apiUrl } = useAppConfig();
  const [memoText, setMemoText] = React.useState("");
  const [memoTags, setMemoTags] = React.useState<string[]>([]);
  const [tagInputValue, setTagInputValue] = React.useState("");
  const [showTagInput, setShowTagInput] = React.useState(false);
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = React.useState<string[]>([]);
  const tagInputRef = React.useRef<HTMLInputElement>(null);
  const followTagInputRef = React.useRef<HTMLInputElement>(null);

  const { settings, updateSettings } = useSettings();
  const [showFollowTagInput, setShowFollowTagInput] = React.useState(false);
  const [followTagInputValue, setFollowTagInputValue] = React.useState("");

  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedTag, setSelectedTag] = React.useState<string | undefined>();
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  type FilterType = "all" | "today" | "has_image";
  const [activeFilter, setActiveFilter] = React.useState<FilterType>("all");
  const [pendingDeleteMemoId, setPendingDeleteMemoId] = React.useState<string | null>(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = React.useState<string | null>(null);
  const [lightboxState, setLightboxState] = React.useState<{
    memoId: string;
    attachmentUrls: string[];
    activeIndex: number;
  } | null>(null);

  const apiClient = useApiClient();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Infinite scroll search results
  const {
    data: infiniteSearchData,
    isLoading: isSearchLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage
  } = useInfiniteMemoList(apiClient, {
    q: debouncedSearchQuery || undefined,
    tag: selectedTag,
    from: activeFilter === 'today' ? todayStart.toISOString() : undefined,
    hasImage: activeFilter === 'has_image',
    limit: 20
  });

  // Intersection Observer for Infinite Scroll
  const loadMoreRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const { mutateAsync: createMemo, isPending: isCreating } = useCreateMemo(apiClient);
  const { mutateAsync: removeMemo, isPending: isRemoving } = useRemoveMemo(apiClient);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const applyDeleteState = React.useCallback((state: {
    pendingDeleteMemoId: string | null;
    deleteErrorMessage: string | null;
  }) => {
    setPendingDeleteMemoId(state.pendingDeleteMemoId);
    setDeleteErrorMessage(state.deleteErrorMessage);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setSelectedFiles(prev => [...prev, ...files]);

    const newPreviews = files.map(file => URL.createObjectURL(file));
    setImagePreviews(prev => [...prev, ...newPreviews]);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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

  const removeTag = (tag: string) => {
    setMemoTags(prev => prev.filter(t => t !== tag));
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
    } catch (e) {
      console.error(e);
      alert("Failed to send memo");
    }
  };

  const toggleTag = (tag: string) => {
    if (selectedTag === tag) {
      setSelectedTag(undefined);
    } else {
      setSelectedTag(tag);
    }
  };

  const handleDeleteClick = (memoId: string) => {
    applyDeleteState(openMemoDeleteConfirmation(memoId));
  };

  const handleDeleteCancel = () => {
    applyDeleteState(
      cancelMemoDeleteConfirmation(
        {
          pendingDeleteMemoId,
          deleteErrorMessage,
        },
        isRemoving,
      ),
    );
  };

  const handleDeleteConfirm = async (memoId: string) => {
    applyDeleteState(await confirmMemoDelete(memoId, removeMemo));
  };

  const handleEditClick = (memoId: string) => {
    window.history.pushState({}, "", `/memos/${encodeURIComponent(memoId)}/edit`);
    window.dispatchEvent(new Event(appNavigateEvent));
  };
  
  const handleAddFollowTag = async (raw: string) => {
    const tag = raw.replace(/^#+/, '').trim();
    if (!tag) return;
    
    const currentTags = settings.followedTags || [];
    if (currentTags.includes(tag)) return;
    
    await updateSettings({
      followedTags: [...currentTags, tag]
    });
    setFollowTagInputValue("");
    setShowFollowTagInput(false);
  };
  
  const handleRemoveFollowTag = async (tag: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentTags = settings.followedTags || [];
    await updateSettings({
      followedTags: currentTags.filter(t => t !== tag)
    });
    if (selectedTag === tag) {
      setSelectedTag(undefined);
    }
  };

  const openLightbox = (memoId: string, attachmentUrls: string[], activeIndex: number) => {
    setLightboxState({
      memoId,
      attachmentUrls,
      activeIndex
    });
  };

  const closeLightbox = () => {
    setLightboxState(null);
  };

  const showPreviousLightboxImage = () => {
    setLightboxState((current) => {
      if (!current) {
        return null;
      }

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
      if (!current) {
        return null;
      }

      return {
        ...current,
        activeIndex: current.activeIndex === current.attachmentUrls.length - 1
          ? 0
          : current.activeIndex + 1
      };
    });
  };

  React.useEffect(() => {
    if (!lightboxState) {
      return;
    }

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

  const followedTags = settings.followedTags || [];

  const isLoading = isSearchLoading && !infiniteSearchData;

  let memos: MemoDto[] = infiniteSearchData?.pages.flatMap(page => page.items) || [];

  const apiTotal = infiniteSearchData?.pages[0]?.total;
  const displayTotal = apiTotal ?? memos.length;

  const inboxHeaderSlot = (
    <div className="flex h-10 max-w-md flex-1 items-center rounded-full bg-surface-container-low px-4 transition-shadow focus-within:ring-2 focus-within:ring-primary/20">
      <Search size={16} className="mr-2 text-on-surface-variant/40" />
      <input
        type="text"
        placeholder="搜索记忆、标签或灵感..."
        className="w-full border-none bg-transparent font-sans text-sm text-primary outline-none placeholder:text-on-surface-variant/40"
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
      {selectedTag ? (
        <div className="ml-2 flex flex-shrink-0 items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-primary">
          <span className="text-[11px] font-bold">#{selectedTag}</span>
          <X
            size={12}
            className="cursor-pointer opacity-70 hover:opacity-100"
            onClick={() => setSelectedTag(undefined)}
          />
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans flex flex-col">
      <DesktopShellHeader activeTab="all" centerSlot={inboxHeaderSlot} />

      {/* Main Content Area */}
      <main className="flex-1 flex max-w-6xl mx-auto w-full px-6 py-10 gap-14">

        {/* Left Column - Memory Stream */}
        <div className="flex-1 max-w-3xl flex flex-col">
          <div className="mb-8">
            <h1 className="text-4xl font-serif italic tracking-tight font-bold text-primary mb-3">你的记忆流</h1>
            <p className="text-on-surface-variant text-[13px] tracking-widest font-sans">捕捉这一刻，剩下的交给时间整理。</p>
          </div>

          {/* Input Box Component */}
          <div className="bg-surface-container-lowest rounded-[24px] p-6 shadow-sm mb-6 border border-outline-variant/10 focus-within:border-primary/20 focus-within:shadow-md transition-all">
            <textarea
              placeholder="记下此刻的想法..."
              className="w-full bg-transparent border-none resize-none focus:outline-none min-h-[100px] text-lg font-sans placeholder:text-on-surface-variant/30 text-primary leading-relaxed"
              value={memoText}
              onChange={(e) => setMemoText(e.target.value)}
              disabled={isCreating}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />

            {/* Image Previews */}
            {imagePreviews.length > 0 && (
              <div className="flex gap-4 flex-wrap mt-2 mb-4">
                {imagePreviews.map((preview, idx) => (
                  <div key={idx} className="relative w-24 h-24 rounded-xl overflow-hidden border border-outline-variant/20 group">
                    <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeFile(idx)}
                      className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
                      disabled={isCreating}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Tag Area */}
            {(memoTags.length > 0 || showTagInput) && (
              <div className="flex flex-wrap gap-2 mb-4 items-center">
                {memoTags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold">
                    #{tag}
                    <button onClick={() => removeTag(tag)} className="opacity-60 hover:opacity-100 ml-1">
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
                      } else if (e.key === 'Escape') {
                        setShowTagInput(false);
                        setTagInputValue('');
                      }
                    }}
                    onBlur={() => {
                      if (tagInputValue) addTag(tagInputValue);
                      if (memoTags.length === 0 && !tagInputValue) setShowTagInput(false);
                    }}
                    placeholder="输入标签后按 Enter"
                    className="bg-transparent border-none outline-none text-xs text-primary placeholder:text-on-surface-variant/40 min-w-[120px] font-medium"
                    autoFocus
                  />
                )}
              </div>
            )}

            <div className="flex justify-between items-center mt-4">
              <div className="flex gap-4 text-on-surface-variant/40 ml-1">
                <input
                  type="file"
                  id="memo-image-upload"
                  className="hidden"
                  accept="image/*"
                  multiple
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  disabled={isCreating}
                />
                <label htmlFor="memo-image-upload" className="cursor-pointer hover:text-primary transition-colors flex items-center">
                  <ImageIcon size={20} />
                </label>
                <TagIcon
                  size={20}
                  className={`cursor-pointer transition-colors ${showTagInput || memoTags.length > 0 ? 'text-primary' : 'hover:text-primary'}`}
                  onClick={() => {
                    setShowTagInput(true);
                    setTimeout(() => tagInputRef.current?.focus(), 50);
                  }}
                />
                <LinkIcon size={20} className="cursor-pointer hover:text-primary transition-colors" />
              </div>
              <button
                className="bg-success hover:brightness-105 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-md shadow-success/10 flex items-center gap-2 disabled:opacity-50"
                onClick={handleSend}
                disabled={isCreating || (!memoText.trim() && selectedFiles.length === 0)}
              >
                {isCreating && <Loader2 size={14} className="animate-spin" />}
                记录这条想法
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-3 mb-8">
            <button
              onClick={() => setActiveFilter("all")}
              className={`px-5 py-2 rounded-full text-xs font-bold transition-colors ${activeFilter === 'all' ? 'bg-primary text-white shadow-sm' : 'bg-surface-container text-on-surface-variant/80 hover:bg-surface-container-high'}`}
            >全部</button>
            <button
              onClick={() => setActiveFilter("today")}
              className={`px-5 py-2 rounded-full text-xs font-bold transition-colors ${activeFilter === 'today' ? 'bg-primary text-white shadow-sm' : 'bg-surface-container text-on-surface-variant/80 hover:bg-surface-container-high'}`}
            >今天</button>
            <button
              onClick={() => setActiveFilter("has_image")}
              className={`px-5 py-2 rounded-full text-xs font-bold transition-colors ${activeFilter === 'has_image' ? 'bg-primary text-white shadow-sm' : 'bg-surface-container text-on-surface-variant/80 hover:bg-surface-container-high'}`}
            >有图片</button>
          </div>

          {/* Memo List Rendered Customly for exact design match */}
          <div className="flex flex-col gap-6">
            {deleteErrorMessage && (
              <div className="rounded-[20px] bg-red-50 px-4 py-3 text-sm text-red-700">
                {deleteErrorMessage}
              </div>
            )}
            {isLoading ? (
              <div className="flex justify-center py-10 opacity-50">
                <Loader2 size={24} className="animate-spin text-primary" />
              </div>
            ) : memos.length === 0 ? (
              <div className="text-center py-10 text-on-surface-variant opacity-60">
                {debouncedSearchQuery || selectedTag || activeFilter !== 'all' ? "没有找到符合条件的 Memo" : "暂无记录的 Memo"}
              </div>
            ) : (
              memos.map((memo) => {
                const dateHeader = formatDateTime(memo.createdAt);
                const isConfirmingDelete = pendingDeleteMemoId === memo.memoId;
                const isDeletingCurrentMemo = isRemoving && isConfirmingDelete;
                return (
                  <article key={memo.memoId} className="group bg-surface-container-low p-8 rounded-[24px] border border-outline-variant/5">
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant/40">
                        {dateHeader} · 记录
                      </div>
                      {isConfirmingDelete ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="rounded-full bg-red-100 px-3 py-1.5 text-[11px] font-bold text-red-700 transition-colors disabled:opacity-50"
                            onClick={() => void handleDeleteConfirm(memo.memoId)}
                            disabled={isDeletingCurrentMemo}
                            aria-label="确认移入回收站"
                          >
                            {isDeletingCurrentMemo ? "删除中..." : "确认删除"}
                          </button>
                          <button
                            type="button"
                            className="rounded-full bg-surface-container px-3 py-1.5 text-[11px] font-bold text-on-surface-variant transition-colors disabled:opacity-50"
                            onClick={handleDeleteCancel}
                            disabled={isDeletingCurrentMemo}
                            aria-label="取消删除"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className="text-[11px] font-bold text-on-surface-variant/45 opacity-0 transition-all hover:text-primary group-hover:opacity-100"
                            onClick={() => handleEditClick(memo.memoId)}
                            aria-label="编辑这条 memo"
                          >
                            编辑
                          </button>
                          <button
                            type="button"
                            className="text-[11px] font-bold text-on-surface-variant/45 opacity-0 transition-all hover:text-red-700 group-hover:opacity-100 disabled:opacity-30"
                            onClick={() => handleDeleteClick(memo.memoId)}
                            disabled={isRemoving}
                            aria-label="删除这条 memo"
                          >
                            删除
                          </button>
                        </div>
                      )}
                    </div>
                    {isConfirmingDelete && (
                      <div className="mb-4 text-[12px] text-on-surface-variant">
                        移入回收站？
                      </div>
                    )}
                    <p className="font-sans text-lg text-primary leading-[1.8] whitespace-pre-wrap mb-6">
                      {memo.content}
                    </p>

                    {memo.attachments && memo.attachments.length > 0 && (() => {
                      const attachmentUrls = memo.attachments
                        .map(normalizeAttachmentUrl)
                        .filter(Boolean);

                      if (attachmentUrls.length === 0) {
                        return null;
                      }

                      const previewUrls = attachmentUrls.slice(0, 4);
                      const remainingCount = attachmentUrls.length - previewUrls.length;
                      const gridColumnsClass = "grid-cols-2";

                      return (
                        <div className="mb-6">
                          <div
                            data-testid="memo-attachment-grid"
                            className={`grid ${gridColumnsClass} max-w-[360px] gap-3`}
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

                    {memo.tags && memo.tags.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {memo.tags.map(tag => (
                          <button key={tag} onClick={() => toggleTag(tag)} className="px-3 py-1 bg-surface-container/80 hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors text-[11px] font-bold rounded-lg tracking-wide border border-outline-variant/5">
                            #{tag}
                          </button>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })
            )}

            {hasNextPage && (
              <div ref={loadMoreRef} className="flex justify-center py-8">
                {isFetchingNextPage ? (
                  <Loader2 size={20} className="animate-spin text-primary/40" />
                ) : (
                  <div className="h-4 w-4" />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Sidebar Widgets */}
        <div className="w-72 flex flex-col gap-6 pt-[88px] flex-shrink-0">

          {/* Overview */}
          <section className="bg-surface-container-low rounded-[24px] p-7 border border-outline-variant/10">
            <h3 className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant/40 mb-2">概览</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-serif font-bold italic text-primary">{isLoading ? "-" : displayTotal}</span>
              <span className="text-xs text-on-surface-variant font-medium tracking-wide">
                {debouncedSearchQuery || selectedTag
                  ? "条相关搜索结果"
                  : activeFilter === "today"
                    ? "今日已记录记忆"
                    : activeFilter === "has_image"
                      ? "条包含图片的记忆"
                      : "条记忆记录"
                }
              </span>
            </div>
          </section>

          {/* Followed Tags */}
          <section className="bg-surface-container-low rounded-[24px] p-7 border border-outline-variant/10">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant/40">关注标签</h3>
              <button 
                onClick={() => {
                  setShowFollowTagInput(true);
                  setTimeout(() => followTagInputRef.current?.focus(), 50);
                }}
                className="text-on-surface-variant/40 hover:text-primary transition-colors"
                title="添加关注标签"
              >
                <Plus size={14} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {followedTags.length === 0 && !showFollowTagInput && (
                <p className="text-[11px] text-on-surface-variant/30 font-medium italic">暂无关注标签</p>
              )}
              {followedTags.map((tag) => {
                const isActive = selectedTag === tag;
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`group relative px-4 py-2 text-xs font-bold rounded-xl transition-all border border-outline-variant/5 ${isActive
                      ? "bg-primary text-white shadow-md shadow-primary/10 pl-4 pr-4"
                      : "bg-surface-container/60 hover:bg-surface-container text-on-surface-variant hover:pr-8"
                      }`}
                  >
                    #{tag}
                    {!isActive && (
                      <span 
                        onClick={(e) => handleRemoveFollowTag(tag, e)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-black/5 rounded-full"
                      >
                       <X size={10} />
                      </span>
                    )}
                    {isActive && (
                      <span 
                        onClick={(e) => handleRemoveFollowTag(tag, e)}
                        className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
                      >
                       <X size={10} />
                      </span>
                    )}
                  </button>
                );
              })}
              {showFollowTagInput && (
                <div className="w-full mt-1">
                  <input
                    ref={followTagInputRef}
                    type="text"
                    value={followTagInputValue}
                    onChange={(e) => setFollowTagInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddFollowTag(followTagInputValue);
                      } else if (e.key === 'Escape') {
                        setShowFollowTagInput(false);
                        setFollowTagInputValue("");
                      }
                    }}
                    onBlur={() => {
                      if (followTagInputValue) {
                        handleAddFollowTag(followTagInputValue);
                      } else {
                        setShowFollowTagInput(false);
                      }
                    }}
                    placeholder="输入标签名..."
                    className="w-full bg-surface-container/40 border border-primary/20 rounded-xl px-3 py-2 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                    autoFocus
                  />
                </div>
              )}
            </div>
          </section>

          {/* System Tasks */}
          <section className="bg-surface-container-low rounded-[24px] p-7 border border-outline-variant/10">
            <h3 className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant/40 mb-5">系统任务</h3>
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-sm font-bold text-primary mb-1">系统已就绪</h4>
                  <p className="text-[10px] text-on-surface-variant/50">已连接本地服务</p>
                </div>
                <CheckCircle2 size={14} className="text-success mt-1" />
              </div>
            </div>
          </section>

        </div>
      </main>

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
