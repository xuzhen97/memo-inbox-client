import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Image as ImageIcon, Loader2, Save, Tag as TagIcon, X } from "lucide-react";

import { useMemo as useMemoQuery, useUpdateMemo } from "@memo-inbox/api-client";

import { useApiClient } from "../api/ApiClientContext";
import { useAppConfig } from "../config/AppConfigContext";
import { appNavigateEvent } from "../router/createAppRouter";
import { formatDateTime } from "../utils/formatDateTime";

export interface DesktopMemoEditProps {
  memoId: string;
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

function resolveAttachmentUrl(baseUrl: string, url?: string) {
  if (!url) {
    return "";
  }

  if (url.startsWith("http") || url.startsWith("blob:")) {
    return url;
  }

  return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
}

function areSameItems(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((item, index) => item === right[index]);
}

export function DesktopMemoEdit({ memoId }: DesktopMemoEditProps) {
  const { apiUrl } = useAppConfig();
  const apiClient = useApiClient();
  const { data: memo, isLoading } = useMemoQuery(apiClient, memoId);
  const { mutateAsync: updateMemo, isPending: isSaving } = useUpdateMemo(apiClient);
  const contentInputRef = useRef<HTMLTextAreaElement | null>(null);
  const liveContentDraftRef = useRef(memo?.content ?? "");
  const [contentDraft, setContentDraft] = useState(() => memo?.content ?? "");
  const [tagDraft, setTagDraft] = useState<string[]>(() => memo?.tags ?? []);
  const [tagInputValue, setTagInputValue] = useState("");
  const [keptAttachmentUrls, setKeptAttachmentUrls] = useState<string[]>(
    () => memo?.attachments.map(normalizeAttachmentUrl).filter(Boolean) ?? []
  );
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newFilePreviewUrls, setNewFilePreviewUrls] = useState<string[]>([]);

  useEffect(() => {
    if (!memo) {
      return;
    }

    setContentDraft(memo.content);
    liveContentDraftRef.current = memo.content;
    setTagDraft(memo.tags);
    setTagInputValue("");
    setKeptAttachmentUrls(memo.attachments.map(normalizeAttachmentUrl).filter(Boolean));
    setNewFiles([]);
    setNewFilePreviewUrls([]);
  }, [memo]);

  useEffect(() => {
    const textarea = contentInputRef.current;
    if (!textarea) {
      return;
    }

    const handleNativeInput = () => {
      liveContentDraftRef.current = textarea.value;
      setContentDraft(textarea.value);
    };

    textarea.addEventListener("input", handleNativeInput);
    return () => {
      textarea.removeEventListener("input", handleNativeInput);
    };
  }, []);

  useEffect(() => {
    return () => {
      for (const previewUrl of newFilePreviewUrls) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [newFilePreviewUrls]);

  const currentContentDraft = liveContentDraftRef.current;
  const memoAttachmentUrls = memo?.attachments.map(normalizeAttachmentUrl).filter(Boolean) ?? [];
  const hasAttachmentChanges = Boolean(
    memo && (
      !areSameItems(keptAttachmentUrls, memoAttachmentUrls)
      || newFiles.length > 0
    )
  );
  const hasUnsavedChanges = Boolean(
    memo && (
      currentContentDraft !== memo.content
      || !areSameItems(tagDraft, memo.tags)
      || hasAttachmentChanges
    )
  );

  const navigateToList = () => {
    window.history.pushState({}, "", "/");
    window.dispatchEvent(new Event(appNavigateEvent));
  };

  const handleExistingAttachmentRemove = (url: string) => {
    setKeptAttachmentUrls((current) => current.filter((item) => item !== url));
  };

  const addTag = (rawValue: string) => {
    const nextTag = rawValue.replace(/^#+/, "").trim();
    if (!nextTag) {
      return;
    }

    setTagDraft((current) => (current.includes(nextTag) ? current : [...current, nextTag]));
    setTagInputValue("");
  };

  const removeTag = (tagToRemove: string) => {
    setTagDraft((current) => current.filter((tag) => tag !== tagToRemove));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      return;
    }

    setNewFiles((current) => [...current, ...files]);
    setNewFilePreviewUrls((current) => [
      ...current,
      ...files.map((file) => URL.createObjectURL(file))
    ]);
    event.target.value = "";
  };

  const handleNewAttachmentRemove = (index: number) => {
    setNewFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));
    setNewFilePreviewUrls((current) => {
      const next = [...current];
      const [removed] = next.splice(index, 1);
      if (removed) {
        URL.revokeObjectURL(removed);
      }
      return next;
    });
  };

  const handleCancel = () => {
    if (hasUnsavedChanges && !window.confirm("有未保存的改动，确认离开吗？")) {
      return;
    }

    navigateToList();
  };

  const handleSave = async () => {
    const input = hasAttachmentChanges
      ? {
          content: currentContentDraft,
          tags: tagDraft,
          keepAttachmentUrls: keptAttachmentUrls,
          files: newFiles
        }
      : {
          content: currentContentDraft,
          tags: tagDraft
        };

    await updateMemo({
      memoId,
      input
    });

    navigateToList();
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-surface text-on-surface">
        <div className="mx-auto flex w-full max-w-5xl flex-col px-6 py-10">
          <h1 className="text-3xl font-serif font-bold italic text-primary">编辑这条记忆</h1>
          <p className="mt-3 text-sm text-on-surface-variant">加载中...</p>
        </div>
      </main>
    );
  }

  if (!memo) {
    return (
      <main className="min-h-screen bg-surface text-on-surface">
        <div className="mx-auto flex w-full max-w-5xl flex-col px-6 py-10">
          <h1 className="text-3xl font-serif font-bold italic text-primary">编辑这条记忆</h1>
          <p className="mt-3 text-sm text-on-surface-variant">未找到这条 memo。</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface text-on-surface" data-memo-id={memoId}>
      <div className="mx-auto flex w-full max-w-6xl flex-col px-6 py-10 lg:px-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <button
              type="button"
              className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-on-surface-variant transition-colors hover:text-primary"
              aria-label="取消编辑"
              onClick={handleCancel}
            >
              <ArrowLeft size={16} />
              返回列表
            </button>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-on-surface-variant/50">
              Memo Edit
            </p>
            <h1 className="mt-2 text-4xl font-serif font-bold italic tracking-tight text-primary">
              编辑这条记忆
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-on-surface-variant">
              在同一页里修改正文、确认保留的图片，并追加新的附件后一次性保存。
            </p>
          </div>
          <div className="rounded-[24px] border border-outline-variant/10 bg-surface-container-low px-5 py-4 text-sm text-on-surface-variant">
            <div>创建时间：{formatDateTime(memo.createdAt)}</div>
            <div className="mt-1">最后修改：{formatDateTime(memo.updatedAt)}</div>
            <div className="mt-1">Memo ID：{memo.memoId}</div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-[28px] border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-sm font-bold text-primary">
              <TagIcon size={16} />
              正文
            </div>
            <textarea
              ref={contentInputRef}
              className="min-h-[280px] w-full resize-none rounded-[24px] border border-outline-variant/10 bg-surface px-5 py-4 text-base leading-8 text-primary outline-none transition-colors placeholder:text-on-surface-variant/35 focus:border-primary/30"
              placeholder="整理这条记忆的正文..."
              value={contentDraft}
              onChange={(event) => {
                liveContentDraftRef.current = event.target.value;
                setContentDraft(event.target.value);
              }}
              onInput={(event) => {
                liveContentDraftRef.current = (event.target as HTMLTextAreaElement).value;
                setContentDraft((event.target as HTMLTextAreaElement).value);
              }}
            />
          </section>

          <aside className="flex flex-col gap-6">
            <section className="rounded-[28px] border border-outline-variant/10 bg-surface-container-low p-6">
              <div className="mb-4 flex items-center gap-2 text-sm font-bold text-primary">
                <TagIcon size={16} />
                标签
              </div>
              <div className="flex flex-wrap gap-2">
                {tagDraft.length > 0 ? tagDraft.map((tag, index) => (
                  <span
                    key={`${tag}-${index}`}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary"
                  >
                    #{tag}
                    <button
                      type="button"
                      className="text-primary/70 transition-colors hover:text-primary"
                      aria-label={`移除标签 ${tag}`}
                      onClick={() => removeTag(tag)}
                    >
                      <X size={12} />
                    </button>
                  </span>
                )) : (
                  <span className="text-sm text-on-surface-variant">这条 memo 暂无标签</span>
                )}
              </div>
              <div className="mt-4">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tagInputValue}
                    aria-label="添加标签"
                    placeholder="输入标签后按 Enter"
                    className="w-full rounded-full border border-outline-variant/10 bg-surface px-4 py-3 text-sm text-primary outline-none transition-colors placeholder:text-on-surface-variant/40 focus:border-primary/30"
                    onChange={(event) => setTagInputValue(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === "," || event.key === " ") {
                        event.preventDefault();
                        addTag(event.currentTarget.value);
                      }
                    }}
                  />
                  <button
                    type="button"
                    aria-label="确认添加标签"
                    className="shrink-0 rounded-full bg-primary px-4 py-3 text-xs font-bold text-white transition-colors hover:brightness-105"
                    onClick={() => addTag(tagInputValue)}
                  >
                    添加
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-outline-variant/10 bg-surface-container-low p-6">
              <div className="mb-4 flex items-center gap-2 text-sm font-bold text-primary">
                <ImageIcon size={16} />
                当前附件
              </div>
              <div className="space-y-4">
                {keptAttachmentUrls.length > 0 ? keptAttachmentUrls.map((url) => (
                  <div key={url} className="overflow-hidden rounded-[22px] border border-outline-variant/10 bg-surface">
                      <img
                      src={resolveAttachmentUrl(apiUrl, url)}
                      alt="Memo attachment"
                      className="h-44 w-full object-cover"
                    />
                    <div className="flex items-center justify-between gap-3 px-4 py-3">
                      <span className="truncate text-xs text-on-surface-variant">{url}</span>
                      <button
                        type="button"
                        className="shrink-0 text-xs font-bold text-red-700 transition-colors hover:text-red-800"
                        aria-label="移除已有附件"
                        onClick={() => handleExistingAttachmentRemove(url)}
                      >
                        移除
                      </button>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-[22px] border border-dashed border-outline-variant/20 px-4 py-6 text-sm text-on-surface-variant">
                    当前没有保留中的附件。
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[28px] border border-outline-variant/10 bg-surface-container-low p-6">
              <div className="mb-4 flex items-center gap-2 text-sm font-bold text-primary">
                <ImageIcon size={16} />
                新增附件
              </div>
              <label className="flex cursor-pointer items-center justify-center rounded-[22px] border border-dashed border-primary/30 bg-primary/5 px-4 py-6 text-sm font-bold text-primary transition-colors hover:bg-primary/10">
                选择图片
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
              </label>
              <div className="mt-4 space-y-4">
                {newFilePreviewUrls.map((previewUrl, index) => (
                  <div key={`${previewUrl}-${index}`} className="overflow-hidden rounded-[22px] border border-outline-variant/10 bg-surface">
                    <img
                      src={resolveAttachmentUrl(apiUrl, previewUrl)}
                      alt={`New attachment ${index + 1}`}
                      className="h-36 w-full object-cover"
                    />
                    <div className="flex items-center justify-between gap-3 px-4 py-3">
                      <span className="truncate text-xs text-on-surface-variant">
                        {newFiles[index]?.name ?? `附件 ${index + 1}`}
                      </span>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-xs font-bold text-on-surface-variant transition-colors hover:text-primary"
                        aria-label={`移除新增附件 ${newFiles[index]?.name ?? index}`}
                        onClick={() => handleNewAttachmentRemove(index)}
                      >
                        <X size={12} />
                        取消新增
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>

        <div data-new-files-count={newFiles.length} />

        <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            className="rounded-full bg-surface-container px-5 py-3 text-sm font-bold text-on-surface-variant transition-colors hover:text-primary"
            aria-label="取消编辑"
            onClick={handleCancel}
          >
            取消
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full bg-success px-6 py-3 text-sm font-bold text-white transition-all hover:brightness-105 disabled:opacity-50"
            aria-label="保存 memo"
            onClick={() => void handleSave()}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            保存
          </button>
        </div>
      </div>
    </main>
  );
}
