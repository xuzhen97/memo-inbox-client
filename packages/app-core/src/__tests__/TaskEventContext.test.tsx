import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi, beforeEach } from "vitest";

import type { MemoTaskEvent } from "@memo-inbox/shared-types";

import { TaskEventProvider, useTaskEvents } from "../api/TaskEventContext";
import { SettingsContext } from "../config/SettingsContext";

const connectMock = vi.fn();
const disconnectMock = vi.fn();
const onMock = vi.fn();
const offMock = vi.fn();
const subscribeTaskMock = vi.fn();
const unsubscribeTaskMock = vi.fn();

const createTaskEventClientMock = vi.fn(() => ({
  connect: connectMock,
  disconnect: disconnectMock,
  on: onMock,
  off: offMock,
  subscribeTask: subscribeTaskMock,
  unsubscribeTask: unsubscribeTaskMock,
}));

vi.mock("@memo-inbox/api-client", () => ({
  createTaskEventClient: (...args: unknown[]) => createTaskEventClientMock(...args),
}));

function Probe() {
  const { notifications, activeTasks, registerTask, unregisterTask } = useTaskEvents();

  return (
    <div>
      <button type="button" onClick={() => registerTask("task-1")} aria-label="register-task">
        register
      </button>
      <button type="button" onClick={() => unregisterTask("task-1")} aria-label="unregister-task">
        unregister
      </button>
      <div data-testid="notification-count">{notifications.length}</div>
      <div data-testid="active-task-count">{Object.keys(activeTasks).length}</div>
    </div>
  );
}

async function renderProvider() {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);

  await act(async () => {
    root.render(
      <SettingsContext.Provider
        value={{
          settings: {
            serviceBaseUrl: "http://127.0.0.1:6005",
            serviceToken: "token",
            socketBaseUrl: "http://127.0.0.1:7001",
            socketVcpKey: "socket-key",
            followedTags: [],
          },
          updateSettings: vi.fn(),
          isLoading: false,
        }}
      >
        <TaskEventProvider>
          <Probe />
        </TaskEventProvider>
      </SettingsContext.Provider>,
    );
  });

  return { host, root };
}

describe("TaskEventProvider", () => {
  beforeEach(() => {
    connectMock.mockReset();
    disconnectMock.mockReset();
    onMock.mockReset();
    offMock.mockReset();
    subscribeTaskMock.mockReset();
    unsubscribeTaskMock.mockReset();
    createTaskEventClientMock.mockClear();
    connectMock.mockResolvedValue(undefined);
  });

  it("uses socketBaseUrl to create the websocket client", async () => {
    const view = await renderProvider();

    expect(createTaskEventClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: "http://127.0.0.1:7001",
        vcpKey: "socket-key",
      }),
    );

    await act(async () => {
      view.root.unmount();
    });
    view.host.remove();
  });

  it("subscribes and unsubscribes task ids through the socket client", async () => {
    const view = await renderProvider();

    await act(async () => {
      view.host.querySelector('button[aria-label="register-task"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });

    expect(subscribeTaskMock).toHaveBeenCalledWith("task-1");

    await act(async () => {
      view.host.querySelector('button[aria-label="unregister-task"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });

    expect(unsubscribeTaskMock).toHaveBeenCalledWith("task-1");

    await act(async () => {
      view.root.unmount();
    });
    view.host.remove();
  });

  it("treats cancelled events as terminal notifications", async () => {
    const view = await renderProvider();
    const handler = onMock.mock.calls.find((call) => call[0] === "memo_task_cancelled")?.[1] as
      | ((event: MemoTaskEvent) => void)
      | undefined;

    expect(handler).toBeTypeOf("function");

    await act(async () => {
      handler?.({
        type: "memo_task_cancelled",
        data: {
          taskId: "task-1",
          taskType: "memo_import",
          status: "cancelled",
          progress: 40,
          message: "已取消",
          result: null,
          error: null,
          createdAt: "2026-04-15T00:00:00.000Z",
          updatedAt: "2026-04-15T00:00:01.000Z",
        },
      });
    });

    expect(view.host.querySelector('[data-testid="notification-count"]')?.textContent).toBe("1");
    expect(view.host.querySelector('[data-testid="active-task-count"]')?.textContent).toBe("0");

    await act(async () => {
      view.root.unmount();
    });
    view.host.remove();
  });
});
