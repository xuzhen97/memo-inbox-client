import * as React from "react";
import { ArrowLeft, Image as ImageIcon, Loader2, Save, Tag as TagIcon, X } from "lucide-react";
import { useMemo as useMemoQuery, useUpdateMemo } from "@memo-inbox/api-client";
import { useApiClient } from "../api/ApiClientContext";
import { useAppConfig } from "../config/AppConfigContext";
import { appNavigateEvent } from "../router/createAppRouter";

export interface MobileMemoEditProps {
  memoId: string;
}

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

function areSameItems(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  return left.every((item, index) => item === right[index]);
}

export function MobileMemoEdit({ memoId }: MobileMemoEditProps) {
  const { apiUrl } = useAppConfig();
  const apiClient = useApiClient();
  const { data: memo, isLoading } = useMemoQuery(apiClient, memoId);
  const { mutateAsync: updateMemo, isPending: isSaving } = useUpdateMemo(apiClient);
  
  const contentInputRef = React.useRef<HTMLTextAreaElement | null>(null);
  const liveContentDraftRef = React.useRef(memo?.content ?? "");
  
  const [contentDraft, setContentDraft] = React.useState(() => memo?.content ?? "");
  const [tagDraft, setTagDraft] = React.useState<string[]>(() => memo?.tags ?? []);
  const [tagInputValue, setTagInputValue] = React.useState("");
  const [keptAttachmentUrls, setKeptAttachmentUrls] = React.useState<string[]>(
    () => memo?.attachments.map(normalizeAttachmentUrl).filter(Boolean) ?? []
  );
  
  const [newFiles, setNewFiles] = React.useState<File[]>([]);
  const [newFilePreviewUrls, setNewFilePreviewUrls] = React.useState<string[]>([]);
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!memo) return;
    setContentDraft(memo.content);
    liveContentDraftRef.current = memo.content;
    setTagDraft(memo.tags);
    setTagInputValue("");
    setKeptAttachmentUrls(memo.attachments.map(normalizeAttachmentUrl).filter(Boolean));
    setNewFiles([]);
    setNewFilePreviewUrls([]);
  }, [memo]);

  React.useEffect(() => {
    const textarea = contentInputRef.current;
    if (!textarea) return;
    const handleNativeInput = () => {
      liveContentDraftRef.current = textarea.value;
      setContentDraft(textarea.value);
    };
    textarea.addEventListener("input", handleNativeInput);
    return () => textarea.removeEventListener("input", handleNativeInput);
  }, []);

  React.useEffect(() => {
    return () => newFilePreviewUrls.forEach(url => URL.revokeObjectURL(url));
  }, [newFilePreviewUrls]);

  const currentContentDraft = liveContentDraftRef.current;
  const memoAttachmentUrls = memo?.attachments.map(normalizeAttachmentUrl).filter(Boolean) ?? [];
  const hasAttachmentChanges = Boolean(
    memo && (!areSameItems(keptAttachmentUrls, memoAttachmentUrls) || newFiles.length > 0)
  );
  const hasUnsavedChanges = Boolean(
    memo && (currentContentDraft !== memo.content || !areSameItems(tagDraft, memo.tags) || hasAttachmentChanges)
  );

  const navigateToList = () => {
    window.history.pushState({}, "", "/");
    window.dispatchEvent(new Event(appNavigateEvent));
  };

  const handleCancel = () => {
    if (hasUnsavedChanges && !window.confirm("有未保存的改动，确认离开吗？")) return;
    navigateToList();
  };

  const addTag = (rawValue: string) => {
    const nextTag = rawValue.replace(/^#+/, "").trim();
    if (!nextTag) return;
    setTagDraft(c => c.includes(nextTag) ? c : [...c, nextTag]);
    setTagInputValue("");
  };

  const removeTag = (tagToRemove: string) => {
    setTagDraft((current) => current.filter((tag) => tag !== tagToRemove));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setNewFiles(c => [...c, ...files]);
    setNewFilePreviewUrls(c => [...c, ...files.map(f => URL.createObjectURL(f))]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    const input = hasAttachmentChanges ? {
      content: currentContentDraft,
      tags: tagDraft,
      keepAttachmentUrls: keptAttachmentUrls,
      files: newFiles
    } : {
      content: currentContentDraft,
      tags: tagDraft
    };
    await updateMemo({ memoId, input });
    navigateToList();
  };

  if (isLoading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-surface w-full">
        <Loader2 size={32} className="animate-spin text-primary/40" />
      </div>
    );
  }

  if (!memo) {
    return (
      <div className="flex flex-col h-[100dvh] bg-[#FCFAFA] font-sans text-on-surface px-5 pt-12 items-center text-center w-full">
         <h1 className="text-xl font-serif font-bold italic text-primary">无法找到此记忆</h1>
         <button onClick={navigateToList} className="mt-8 bg-surface-container px-6 py-2 rounded-full text-sm font-bold text-on-surface-variant">返回收件箱</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-[#FCFAFA] font-sans text-on-surface relative">
      <header className="flex-shrink-0 flex items-center justify-between px-5 h-14 bg-[#FCFAFA] z-10 border-b border-outline-variant/10">
        <button className="p-2 -ml-2 text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 font-bold text-[13px]" onClick={handleCancel}>
          <ArrowLeft size={18} /> 返回主页
        </button>
        <span className="font-bold text-[13px] text-primary invisible">编辑</span>
        <button 
          onClick={handleSave} 
          disabled={isSaving || !hasUnsavedChanges}
          className="bg-[#051F14] text-white text-[12px] font-bold px-4 py-1.5 rounded-full disabled:opacity-30 disabled:bg-surface-container disabled:text-on-surface-variant"
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : "保存更改"}
        </button>
      </header>
      
      <main className="flex-1 overflow-y-auto px-5 pt-6 pb-[100px] flex flex-col gap-8 custom-scrollbar">
        
        {/* Editor Body */}
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-primary mb-3">
             <TagIcon size={14} /> 记忆正文
          </div>
          <div className="bg-white rounded-[24px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-outline-variant/5">
            <textarea
              ref={contentInputRef}
              className="w-full resize-none bg-transparent outline-none min-h-[140px] text-[15px] font-sans text-primary leading-relaxed placeholder:text-on-surface-variant/30"
              placeholder="修改正文..."
              value={contentDraft}
              onChange={(e) => {
                liveContentDraftRef.current = e.target.value;
                setContentDraft(e.target.value);
              }}
            />
          </div>
        </div>

        {/* Labels Management */}
        <div>
           <div className="flex items-center gap-2 text-sm font-bold text-primary mb-3">
             <TagIcon size={14} /> 标签梳理
          </div>
          <div className="bg-white rounded-[24px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-outline-variant/5">
            <div className="flex flex-wrap gap-2 mb-4">
              {tagDraft.length > 0 ? tagDraft.map(tag => (
                <span key={tag} className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-[11px] font-bold">
                  #{tag}
                  <button onClick={() => removeTag(tag)} className="opacity-60 hover:opacity-100 p-0.5 mt-px"><X size={10} /></button>
                </span>
              )) : (
                <span className="text-[12px] text-on-surface-variant/40 italic">暂无标签</span>
              )}
            </div>
            <div className="flex gap-2">
               <input
                 type="text"
                 value={tagInputValue}
                 placeholder="输入单个标签..."
                 className="flex-1 bg-surface-container/50 border border-outline-variant/10 rounded-xl px-3 py-2 text-[12px] focus:outline-none"
                 onChange={(e) => setTagInputValue(e.target.value)}
                 onKeyDown={(e) => {
                   if (e.key === "Enter" || e.key === " ") {
                     e.preventDefault();
                     addTag(e.currentTarget.value);
                   }
                 }}
               />
               <button onClick={() => addTag(tagInputValue)} className="bg-surface-container text-[12px] font-bold px-4 rounded-xl">添加</button>
            </div>
          </div>
        </div>

        {/* Existing Attachments */}
        <div>
           <div className="flex items-center gap-2 text-sm font-bold text-primary mb-3">
             <ImageIcon size={14} /> 保留的附件
          </div>
          <div className="bg-white rounded-[24px] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-outline-variant/5">
            {keptAttachmentUrls.length > 0 ? (
               <div className="grid grid-cols-2 gap-3">
                  {keptAttachmentUrls.map(url => (
                     <div key={url} className="relative aspect-square rounded-[16px] overflow-hidden group border border-outline-variant/10">
                        <img src={resolveAttachmentUrl(apiUrl, url)} className="w-full h-full object-cover" alt="kept att" />
                        <button onClick={() => setKeptAttachmentUrls(c => c.filter(x => x !== url))} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 backdrop-blur-sm">
                           <X size={12} />
                        </button>
                     </div>
                  ))}
               </div>
            ) : (
               <span className="text-[12px] text-on-surface-variant/40 italic">空</span>
            )}
            
            {/* Divider */}
            <div className="my-5 h-px bg-outline-variant/10 w-full" />
            
             <div className="flex items-center justify-between mb-3">
                 <span className="text-[12px] font-bold text-primary">新增图片</span>
                 <label className="text-[11px] bg-primary/10 text-primary font-bold px-3 py-1.5 rounded-full cursor-pointer">
                    选择文件
                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
                 </label>
             </div>
             
             {newFilePreviewUrls.length > 0 ? (
               <div className="flex gap-3 overflow-x-auto pb-2 snap-x custom-scrollbar">
                  {newFilePreviewUrls.map((url, idx) => (
                    <div key={url} className="flex-shrink-0 relative w-24 h-24 rounded-[16px] overflow-hidden border border-primary/20 snap-center">
                       <img src={resolveAttachmentUrl(apiUrl, url)} className="w-full h-full object-cover" alt="new att" />
                        <button onClick={() => {
                           setNewFiles(c => c.filter((_, i) => i !== idx));
                           setNewFilePreviewUrls(c => c.filter((_, i) => i !== idx));
                        }} className="absolute top-1 right-1 bg-red-500/80 text-white rounded-full p-1">
                           <X size={10} />
                        </button>
                    </div>
                  ))}
               </div>
             ) : (
                <span className="text-[12px] text-on-surface-variant/40 italic block mt-1">无需添加新图则忽略此项</span>
             )}
          </div>
        </div>
      </main>
    </div>
  );
}
