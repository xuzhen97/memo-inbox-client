import type { MemoTaskEvent, MemoTaskStatus } from "@memo-inbox/shared-types";
import { createTaskEventClient } from "@memo-inbox/api-client";
import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { useSettings } from "../config/SettingsContext";

interface TaskNotification {
  id: string;
  taskId: string;
  type: string;
  status: MemoTaskStatus;
  progress: number;
  message: string;
  timestamp: string;
  isRead: boolean;
}

interface TaskEventContextValue {
  notifications: TaskNotification[];
  activeTasks: Record<string, MemoTaskEvent["data"]>;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  hasUnread: boolean;
}

export const TaskEventContext = createContext<TaskEventContextValue | null>(null);

export function TaskEventProvider({ children }: PropsWithChildren) {
  const { settings } = useSettings();
  const [notifications, setNotifications] = useState<TaskNotification[]>([]);
  const [activeTasks, setActiveTasks] = useState<Record<string, MemoTaskEvent["data"]>>({});

  const client = useMemo(() => {
    if (!settings.serviceBaseUrl || !settings.socketVcpKey) return null;
    
    return createTaskEventClient({
      baseUrl: settings.serviceBaseUrl,
      vcpKey: settings.socketVcpKey,
      reconnect: {
        enabled: true,
        maxAttempts: 5,
        delayMs: 2000,
      },
    });
  }, [settings.serviceBaseUrl, settings.socketVcpKey]);

  useEffect(() => {
    if (!client) return;

    const handleTaskUpdate = (event: MemoTaskEvent) => {
      const { taskId, status, progress, message, taskType, updatedAt } = event.data;
      
      // Update active tasks
      if (status === "running" || status === "accepted") {
        setActiveTasks(prev => ({ ...prev, [taskId]: event.data }));
      } else {
        setActiveTasks(prev => {
          const next = { ...prev };
          delete next[taskId];
          return next;
        });
      }

      // Add or update notification for important status changes
      if (status === "completed" || status === "failed") {
        setNotifications(prev => {
          const existingIndex = prev.findIndex(n => n.taskId === taskId);
          const notification = {
            id: `${taskId}-${updatedAt}`,
            taskId,
            type: taskType,
            status,
            progress,
            message,
            timestamp: updatedAt,
            isRead: false,
          };

          if (existingIndex >= 0) {
            const next = [...prev];
            next[existingIndex] = notification;
            return next;
          }

          return [notification, ...prev].slice(0, 50);
        });
      }
    };

    client.on("memo_task_progress", handleTaskUpdate);
    client.on("memo_task_completed", handleTaskUpdate);
    client.on("memo_task_failed", handleTaskUpdate);
    client.on("memo_task_accepted", handleTaskUpdate);

    void client.connect().catch(err => {
      console.warn("Task event socket connection failed (expected if settings are not configured):", err);
    });

    return () => {
      client.disconnect();
    };
  }, [client]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const hasUnread = useMemo(() => notifications.some(n => !n.isRead), [notifications]);

  return (
    <TaskEventContext.Provider value={{ 
      notifications, 
      activeTasks, 
      markAsRead, 
      markAllAsRead, 
      clearNotifications,
      hasUnread 
    }}>
      {children}
    </TaskEventContext.Provider>
  );
}

export function useTaskEvents() {
  const context = useContext(TaskEventContext);
  if (!context) {
    throw new Error("useTaskEvents must be used within a TaskEventProvider");
  }
  return context;
}
