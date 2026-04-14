import type { ReactNode } from "react";
import { Bell, Settings, User, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useState } from "react";

import { appNavigateEvent } from "../router/createAppRouter";
import { useTaskEvents } from "../api/TaskEventContext";

interface DesktopShellHeaderProps {
  activeTab: "all" | "review" | "archive";
  centerSlot?: ReactNode;
}

export function DesktopShellHeader({ activeTab, centerSlot }: DesktopShellHeaderProps) {
  const { notifications, activeTasks, hasUnread, markAllAsRead } = useTaskEvents();
  const [showNotifications, setShowNotifications] = useState(false);

  const tabClass = (tab: "all" | "review" | "archive") =>
    activeTab === tab
      ? "text-primary font-bold"
      : "text-on-surface-variant/50 transition-colors hover:text-primary";

  const navigateTo = (pathname: string) => {
    if (window.location.pathname === pathname) {
      return;
    }

    window.history.pushState({}, "", pathname);
    window.dispatchEvent(new Event(appNavigateEvent));
  };

  const activeTaskCount = Object.keys(activeTasks).length;

  const getTaskTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      memo_import: "笔记导入",
      memo_maintenance: "系统维护",
      memo_reindex: "索引重建",
      memo_reconcile: "数据对齐"
    };
    return labels[type] || type.toUpperCase();
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-surface/90 px-6 backdrop-blur-md lg:px-10 border-b border-outline-variant/5">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary pb-0.5 font-bold text-white">
          M
        </div>
        <span className="ml-1 text-lg font-bold tracking-wide text-primary">记忆收件箱</span>
      </div>

      <div className="ml-10 flex w-full max-w-3xl items-center gap-12">
        <div className="flex flex-1">{centerSlot}</div>

        <nav className="flex gap-6 text-sm font-medium tracking-wide" aria-label="主导航">
          <button
            type="button"
            aria-label="前往全部页面"
            aria-current={activeTab === "all" ? "page" : undefined}
            className={tabClass("all")}
            onClick={() => navigateTo("/")}
          >
            全部
          </button>
          <button
            type="button"
            aria-label="前往回顾页面"
            aria-current={activeTab === "review" ? "page" : undefined}
            className={tabClass("review")}
            onClick={() => navigateTo("/review")}
          >
            回顾
          </button>
          <button
            type="button"
            aria-label="前往归档页面"
            aria-current={activeTab === "archive" ? "page" : undefined}
            className={tabClass("archive")}
            onClick={() => navigateTo("/archive")}
          >
            归档
          </button>
        </nav>
      </div>

      <div className="ml-auto flex items-center gap-4 text-on-surface-variant">
        <div className="relative">
          <button 
            type="button"
            onClick={() => {
              setShowNotifications(!showNotifications);
              if (!showNotifications && hasUnread) {
                markAllAsRead();
              }
            }}
            className="p-2 rounded-full hover:bg-surface-container transition-colors relative"
            aria-label="通知"
          >
            <Bell size={20} className={showNotifications || hasUnread || activeTaskCount > 0 ? "text-primary" : "text-on-surface-variant"} />
            {(hasUnread || activeTaskCount > 0) && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-surface animate-pulse" />
            )}
          </button>

          {showNotifications && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowNotifications(false)} 
              />
              <div className="absolute right-0 mt-2 w-80 max-h-[480px] overflow-hidden rounded-[24px] bg-surface-container-high shadow-2xl z-50 border border-outline-variant/10 animate-in fade-in slide-in-from-top-2">
                <div className="p-4 border-b border-outline-variant/5 bg-surface-container-highest/50 flex justify-between items-center">
                  <h3 className="text-sm font-bold text-primary">通知与任务</h3>
                  {activeTaskCount > 0 && (
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                      {activeTaskCount} 个任务正在进行
                    </span>
                  )}
                </div>
                
                <div className="overflow-y-auto max-h-[380px] p-2 space-y-1">
                  {activeTaskCount === 0 && notifications.length === 0 && (
                    <div className="p-8 text-center text-on-surface-variant/40 italic text-xs">
                      暂无通知
                    </div>
                  )}

                  {/* Active Tasks */}
                  {Object.values(activeTasks).map(task => (
                    <div key={task.taskId} className="p-3 rounded-2xl bg-primary/5 border border-primary/10 mb-2">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[11px] font-bold text-primary uppercase tracking-wider">{getTaskTypeLabel(task.taskType)}</span>
                        <Loader2 size={12} className="animate-spin text-primary" />
                      </div>
                      <p className="text-xs text-on-surface-variant mb-2">{task.message}</p>
                      <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-300" 
                          style={{ width: `${task.progress * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}

                  {/* History Notifications */}
                  {notifications.map(n => (
                    <div key={n.id} className={`p-3 rounded-2xl transition-colors ${n.isRead ? 'opacity-60' : 'bg-surface-container-highest shadow-sm'}`}>
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 rounded-full p-1 ${n.status === 'completed' ? 'text-success bg-success/10' : 'text-red-500 bg-red-500/10'}`}>
                          {n.status === 'completed' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/60">{getTaskTypeLabel(n.type)}</span>
                            <span className="text-[9px] text-on-surface-variant/30">{new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-xs font-medium text-on-surface">{n.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <Settings 
          size={20} 
          className="cursor-pointer transition-colors hover:text-primary" 
          onClick={() => navigateTo("/settings")}
        />
        <div className="ml-2 h-8 w-8 overflow-hidden rounded-full border border-outline-variant/20 bg-surface-container-high shadow-sm">
          <User size={24} className="ml-1 mt-1 opacity-50" />
        </div>
      </div>
    </header>
  );
}
