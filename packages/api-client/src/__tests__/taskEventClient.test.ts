import { afterEach, describe, expect, it, vi } from "vitest";

import { createTaskEventClient } from "../index";

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];

  url: string;
  readyState = 0;
  sent: string[] = [];
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  send(message: string) {
    this.sent.push(message);
  }

  close() {
    this.readyState = 3;
    this.onclose?.({} as CloseEvent);
  }

  emitOpen() {
    this.readyState = 1;
    this.onopen?.(new Event("open"));
  }

  emitMessage(payload: unknown) {
    this.onmessage?.({
      data: JSON.stringify(payload)
    } as MessageEvent<string>);
  }

  emitClose() {
    this.readyState = 3;
    this.onclose?.({} as CloseEvent);
  }

  emitError() {
    this.onerror?.(new Event("error"));
  }
}

describe("createTaskEventClient", () => {
  afterEach(() => {
    FakeWebSocket.instances = [];
    vi.useRealTimers();
  });

  it("builds a memo inbox websocket url from the configured baseUrl and vcpKey", async () => {
    const client = createTaskEventClient({
      baseUrl: "https://localhost:3030/",
      vcpKey: "secret",
      WebSocket: FakeWebSocket as unknown as typeof WebSocket
    });

    const connecting = client.connect();
    FakeWebSocket.instances[0]?.emitOpen();
    await connecting;

    expect(FakeWebSocket.instances[0]?.url).toBe("wss://localhost:3030/vcp-memo-inbox/VCP_Key=secret");
  });

  it("sends subscribe and unsubscribe messages for task ids", async () => {
    const client = createTaskEventClient({
      baseUrl: "http://localhost:3030",
      vcpKey: "secret",
      WebSocket: FakeWebSocket as unknown as typeof WebSocket
    });

    const connecting = client.connect();
    const socket = FakeWebSocket.instances[0];
    socket.emitOpen();
    await connecting;

    client.subscribeTask("task_1");
    client.unsubscribeTask("task_1");

    expect(socket.sent).toEqual([
      JSON.stringify({
        type: "memo_subscribe_task",
        data: {
          taskId: "task_1"
        }
      }),
      JSON.stringify({
        type: "memo_unsubscribe_task",
        data: {
          taskId: "task_1"
        }
      })
    ]);
  });

  it("dispatches memo task events to registered listeners", async () => {
    const client = createTaskEventClient({
      baseUrl: "http://localhost:3030",
      vcpKey: "secret",
      WebSocket: FakeWebSocket as unknown as typeof WebSocket
    });
    const handler = vi.fn();

    client.on("memo_task_completed", handler);

    const connecting = client.connect();
    const socket = FakeWebSocket.instances[0];
    socket.emitOpen();
    await connecting;

    socket.emitMessage({
      type: "memo_task_completed",
      data: {
        taskId: "task_1",
        taskType: "memo_import",
        status: "completed",
        progress: 100,
        message: "done",
        result: {
          imported: 1
        },
        error: null,
        createdAt: "2026-04-11T00:00:00.000Z",
        updatedAt: "2026-04-11T00:00:01.000Z"
      }
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "memo_task_completed"
      })
    );
  });

  it("reports connection state changes and socket errors", async () => {
    const client = createTaskEventClient({
      baseUrl: "http://localhost:3030",
      vcpKey: "secret",
      WebSocket: FakeWebSocket as unknown as typeof WebSocket
    });
    const states: string[] = [];
    const errorHandler = vi.fn();

    client.onStateChange((state) => {
      states.push(state);
    });
    client.onError(errorHandler);

    const connecting = client.connect();
    const socket = FakeWebSocket.instances[0];
    socket.emitOpen();
    await connecting;

    socket.emitError();
    client.disconnect();

    expect(states).toEqual(["connecting", "open", "closed"]);
    expect(errorHandler).toHaveBeenCalledTimes(1);
  });

  it("rejects connect when the socket closes before opening", async () => {
    vi.useFakeTimers();

    const client = createTaskEventClient({
      baseUrl: "http://localhost:3030",
      vcpKey: "secret",
      WebSocket: FakeWebSocket as unknown as typeof WebSocket
    });

    const connecting = client.connect().then(
      () => "resolved",
      (error) => error
    );
    const socket = FakeWebSocket.instances[0];

    socket.emitClose();
    await vi.advanceTimersByTimeAsync(0);

    const result = await Promise.race([
      connecting,
      new Promise<string>((resolve) => {
        setTimeout(() => resolve("pending"), 0);
      })
    ]);

    expect(result).toMatchObject({
      code: "SOCKET_ERROR"
    });
  });

  it("reconnects by default when reconnect is enabled without maxAttempts", async () => {
    vi.useFakeTimers();

    const client = createTaskEventClient({
      baseUrl: "http://localhost:3030",
      vcpKey: "secret",
      WebSocket: FakeWebSocket as unknown as typeof WebSocket,
      reconnect: {
        enabled: true,
        delayMs: 50
      }
    });

    const connecting = client.connect();
    const firstSocket = FakeWebSocket.instances[0];
    firstSocket.emitOpen();
    await connecting;

    firstSocket.emitClose();
    await vi.advanceTimersByTimeAsync(50);

    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it("reconnects and restores subscriptions when reconnect is enabled", async () => {
    vi.useFakeTimers();

    const client = createTaskEventClient({
      baseUrl: "http://localhost:3030",
      vcpKey: "secret",
      WebSocket: FakeWebSocket as unknown as typeof WebSocket,
      reconnect: {
        enabled: true,
        maxAttempts: 1,
        delayMs: 50
      }
    });

    const connecting = client.connect();
    const firstSocket = FakeWebSocket.instances[0];
    firstSocket.emitOpen();
    await connecting;

    client.subscribeTask("task_2");
    expect(firstSocket.sent).toEqual([
      JSON.stringify({
        type: "memo_subscribe_task",
        data: {
          taskId: "task_2"
        }
      })
    ]);

    firstSocket.emitClose();
    await vi.advanceTimersByTimeAsync(50);

    const secondSocket = FakeWebSocket.instances[1];
    secondSocket.emitOpen();

    expect(secondSocket.sent).toEqual([
      JSON.stringify({
        type: "memo_subscribe_task",
        data: {
          taskId: "task_2"
        }
      })
    ]);
  });
});
