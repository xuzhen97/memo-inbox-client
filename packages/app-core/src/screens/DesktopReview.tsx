import { Loader2, RefreshCcw } from "lucide-react";
import { useReviewRandomMemo } from "@memo-inbox/api-client";

import { useApiClient } from "../api/ApiClientContext";
import { useAppConfig } from "../config/AppConfigContext";
import { appNavigateEvent } from "../router/createAppRouter";
import { formatDateTime } from "../utils/formatDateTime";
import { DesktopShellHeader } from "../components/DesktopShellHeader";

function resolveAttachmentUrl(baseUrl: string, url?: string) {
  if (!url) {
    return "";
  }

  if (url.startsWith("http") || url.startsWith("blob:")) {
    return url;
  }

  return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
}

function navigateToInbox() {
  if (window.location.pathname !== "/") {
    window.history.pushState({}, "", "/");
    window.dispatchEvent(new Event(appNavigateEvent));
  }
}

export function DesktopReview() {
  const apiClient = useApiClient();
  const { apiUrl } = useAppConfig();
  const { data, isLoading, isFetching, error, refetch } = useReviewRandomMemo(apiClient);

  return (
    <div className="flex min-h-screen flex-col bg-surface font-sans text-on-surface">
      <DesktopShellHeader
        activeTab="review"
        centerSlot={<div className="h-10 max-w-md flex-1 rounded-full bg-surface-container-low/70" />}
      />

      <main className="mx-auto flex w-full max-w-6xl flex-1 gap-14 px-6 py-10">
        <div className="flex-1 max-w-3xl">
          <div className="mb-8">
            <h1 className="mb-3 text-4xl font-serif font-bold italic tracking-tight text-primary">重温旧记忆</h1>
            <p className="text-[13px] tracking-wide text-on-surface-variant">
              偶尔回看一条旧记录，让一些片段重新浮现。
            </p>
          </div>

          {isLoading ? (
            <div className="rounded-[24px] bg-surface-container-low p-8 text-on-surface-variant">
              正在取一条旧记忆...
            </div>
          ) : error && (error as { code?: string }).code === "MEMO_NOT_FOUND" ? (
            <div className="rounded-[24px] bg-surface-container-low p-8">
              <h2 className="mb-3 text-2xl font-serif text-primary">还没有可回顾的记忆</h2>
              <p className="mb-6 text-sm leading-7 text-on-surface-variant">
                先回到全部页面记下一些片段，再回来重温它们。
              </p>
              <button
                type="button"
                aria-label="返回全部页面"
                className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-white"
                onClick={navigateToInbox}
              >
                回到全部
              </button>
            </div>
          ) : error ? (
            <div className="rounded-[24px] bg-surface-container-low p-8">
              <h2 className="mb-3 text-2xl font-serif text-primary">这次没有取到旧记忆</h2>
              <p className="mb-6 text-sm leading-7 text-on-surface-variant">
                请稍后再试一次，或回到全部页面继续浏览。
              </p>
              <button
                type="button"
                aria-label="重新获取旧记忆"
                className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-white"
                onClick={() => void refetch()}
              >
                重试
              </button>
            </div>
          ) : data ? (
            <>
              <article className="rounded-[24px] bg-surface-container-low p-8">
                <div className="mb-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/40">
                  {formatDateTime(data.createdAt)} · 旧记录
                </div>
                <p className="mb-6 whitespace-pre-wrap text-lg leading-[1.8] text-primary">{data.content}</p>

                {data.attachments.length > 0 ? (
                  <div className="mb-6 grid max-w-[360px] grid-cols-2 gap-3">
                    {data.attachments.map((attachment) => (
                      <img
                        key={attachment.imageId}
                        src={resolveAttachmentUrl(apiUrl, attachment.url)}
                        alt={attachment.relativePath}
                        className="aspect-square rounded-[20px] object-cover"
                      />
                    ))}
                  </div>
                ) : null}

                {data.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {data.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-lg bg-surface-container px-3 py-1 text-[11px] font-bold text-on-surface-variant"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </article>

              <div className="mt-6">
                <button
                  type="button"
                  aria-label="再看一条旧记忆"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-bold text-white disabled:opacity-60"
                  onClick={() => void refetch()}
                  disabled={isFetching}
                >
                  {isFetching ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
                  {isFetching ? "取回中..." : "换一条"}
                </button>
              </div>
            </>
          ) : null}
        </div>

        <aside className="w-72 flex-shrink-0 pt-[88px]">
          <section className="rounded-[24px] bg-surface-container-low p-7">
            <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/40">回顾说明</h3>
            <p className="text-sm leading-7 text-on-surface-variant">
              这里会重新翻看一条已有 memo。当前是轻量实现，不承诺复杂策略或真正随机。
            </p>
          </section>
        </aside>
      </main>
    </div>
  );
}
