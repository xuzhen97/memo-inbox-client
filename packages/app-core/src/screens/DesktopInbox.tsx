import * as React from "react";
import { Search, Bell, Settings, User, Image as ImageIcon, Tag as TagIcon, Link as LinkIcon, CheckCircle2, Loader2, X } from "lucide-react";
import { useApiClient } from "../api/ApiClientContext";
import { useMemoList, useCreateMemo, useMemoSearch, useRemoveMemo } from "@memo-inbox/api-client";
import type { MemoDto } from "@memo-inbox/shared-types";
import {
  cancelMemoDeleteConfirmation,
  confirmMemoDelete,
  openMemoDeleteConfirmation,
} from "./memoDeleteState";

const baseUrl = (import.meta as any).env?.VITE_API_URL || "http://127.0.0.1:6005";

function resolveAttachmentUrl(url?: string) {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("blob:")) return url;
  return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
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
  const [memoText, setMemoText] = React.useState("");
  const [memoTags, setMemoTags] = React.useState<string[]>([]);
  const [tagInputValue, setTagInputValue] = React.useState("");
  const [showTagInput, setShowTagInput] = React.useState(false);
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = React.useState<string[]>([]);
  const tagInputRef = React.useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedTag, setSelectedTag] = React.useState<string | undefined>();
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  type FilterType = "all" | "today" | "has_image";
  const [activeFilter, setActiveFilter] = React.useState<FilterType>("all");
  const [pendingDeleteMemoId, setPendingDeleteMemoId] = React.useState<string | null>(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = React.useState<string | null>(null);

  const apiClient = useApiClient();

  // Normal list
  const { data: memoListData, isLoading: isListLoading } = useMemoList(apiClient);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Search results
  const { data: searchData, isLoading: isSearchLoading } = useMemoSearch(apiClient, {
    q: debouncedSearchQuery || undefined,
    tag: selectedTag,
    from: activeFilter === 'today' ? todayStart.toISOString() : undefined
  });

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

  const activeTags = ["工作", "日常", "灵感", "阅读", "设计"];

  const isLoading = isSearchLoading;

  let memos: MemoDto[] = searchData?.items || [];
  if (activeFilter === 'has_image') {
    memos = memos.filter(m => m.attachments && m.attachments.length > 0);
  }

  const totalMemos = memos.length; // Use the actual derived length for UI sync

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans flex flex-col">
      {/* Top Navigation */}
      <header className="h-16 px-6 lg:px-10 flex items-center justify-between sticky top-0 bg-surface/90 backdrop-blur-md z-30">
        <div className="flex items-center gap-2">
          {/* Logo placeholder */}
          <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center text-white font-bold pb-0.5">M</div>
          <span className="font-bold text-lg tracking-wide text-primary ml-1">记忆收件箱</span>
        </div>

        <div className="flex items-center gap-12 w-full max-w-3xl ml-10">
          {/* Search bar */}
          <div className="flex bg-surface-container-low rounded-full h-10 px-4 items-center flex-1 max-w-md focus-within:ring-2 focus-within:ring-primary/20 transition-shadow">
            <Search size={16} className="text-on-surface-variant/40 mr-2" />
            <input
              type="text"
              placeholder="搜索记忆、标签或灵感..."
              className="bg-transparent border-none outline-none text-sm w-full font-sans placeholder:text-on-surface-variant/40 text-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  const match = searchQuery.match(/(?:^|\s)#([^\s#]+)/);
                  if (match) {
                    e.preventDefault();
                    setSelectedTag(match[1]);
                    setSearchQuery(searchQuery.replace(match[0], '').trim());
                  }
                } else if (e.key === 'Backspace' && searchQuery === '' && selectedTag) {
                  setSelectedTag(undefined);
                }
              }}
            />
            {selectedTag && (
              <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-md ml-2 flex-shrink-0">
                <span className="text-[11px] font-bold">#{selectedTag}</span>
                <X size={12} className="cursor-pointer opacity-70 hover:opacity-100" onClick={() => setSelectedTag(undefined)} />
              </div>
            )}
          </div>

          <nav className="flex gap-6 text-sm font-medium tracking-wide">
            <span className="cursor-pointer text-primary font-bold">全部</span>
            <span className="cursor-pointer text-on-surface-variant/50 hover:text-primary transition-colors">回顾</span>
            <span className="cursor-pointer text-on-surface-variant/50 hover:text-primary transition-colors">归档</span>
          </nav>
        </div>

        <div className="flex items-center gap-4 text-on-surface-variant ml-auto">
          <Bell size={20} className="cursor-pointer hover:text-primary transition-colors" />
          <Settings size={20} className="cursor-pointer hover:text-primary transition-colors" />
          <div className="w-8 h-8 bg-surface-container-high rounded-full overflow-hidden border border-outline-variant/20 ml-2 shadow-sm">
            <User size={24} className="mt-1 ml-1 opacity-50" />
          </div>
        </div>
      </header>

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
                const dateHeader = new Date(memo.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
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
                        <button
                          type="button"
                          className="text-[11px] font-bold text-on-surface-variant/45 opacity-0 transition-all hover:text-red-700 group-hover:opacity-100 disabled:opacity-30"
                          onClick={() => handleDeleteClick(memo.memoId)}
                          disabled={isRemoving}
                          aria-label="删除这条 memo"
                        >
                          删除
                        </button>
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
                      const firstAttachment = memo.attachments[0];
                      const urlToResolve = typeof firstAttachment === "string"
                        ? firstAttachment
                        : (firstAttachment as any)?.url;

                      return (
                        <div className="rounded-xl overflow-hidden mb-6 shadow-sm border border-outline-variant/10">
                          <img
                            src={resolveAttachmentUrl(urlToResolve)}
                            alt="Attachment"
                            className="w-full object-cover"
                          />
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
          </div>
        </div>

        {/* Right Column - Sidebar Widgets */}
        <div className="w-72 flex flex-col gap-6 pt-[88px] flex-shrink-0">

          {/* Overview */}
          <section className="bg-surface-container-low rounded-[24px] p-7 border border-outline-variant/10">
            <h3 className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant/40 mb-2">概览</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-serif font-bold italic text-primary">{isListLoading ? "-" : totalMemos}</span>
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

          {/* Active Tags */}
          <section className="bg-surface-container-low rounded-[24px] p-7 border border-outline-variant/10">
            <h3 className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant/40 mb-5">活跃标签</h3>
            <div className="flex flex-wrap gap-2.5">
              {activeTags.map((tag) => {
                const isActive = selectedTag === tag;
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors border border-outline-variant/5 ${isActive
                      ? "bg-primary text-white shadow-md shadow-primary/10"
                      : "bg-surface-container/60 hover:bg-surface-container text-on-surface-variant"
                      }`}
                  >
                    #{tag}
                  </button>
                );
              })}
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
    </div>
  );
}
