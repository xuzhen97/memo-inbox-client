import type {
  ApiErrorPayload,
  AppError,
  CreateImportTaskInput,
  CreateMemoInput,
  MemoDto,
  MemoInboxClientConfig,
  MemoListResponse,
  MemoMaintenanceStatus,
  MemoReviewDailyResponse,
  MemoSearchResponse,
  MemoSystemStatus,
  MemoTaskAcceptedResponse,
  MemoTaskDto,
  MemoTaskEvent,
  MemoTaskEventType,
  MemoTaskErrorsResponse,
  TaskEventClientConfig,
  SearchMemosInput,
  UpdateMemoInput
} from "@memo-inbox/shared-types";

export const queryKeys = {
  memos: ["memos"] as const,
  tasks: ["tasks"] as const,
  maintenance: ["maintenance"] as const
};

interface ResolvedMemoInboxClientConfig {
  baseUrl: string;
  bearerToken: string;
  fetch: typeof fetch;
  headers: HeadersInit | undefined;
}

interface ResolvedTaskEventClientConfig {
  baseUrl: string;
  vcpKey: string;
  WebSocket: typeof WebSocket;
  reconnectEnabled: boolean;
  reconnectMaxAttempts: number;
  reconnectDelayMs: number;
}

type QueryValue = string | number | boolean | null | undefined;
type JsonBody = object;
type TaskEventListener = (event: MemoTaskEvent) => void;
type ConnectionState = "idle" | "connecting" | "open" | "closed";
type StateChangeListener = (state: ConnectionState) => void;
type ErrorListener = (error: unknown) => void;

export function resolveMemoInboxClientConfig(config: MemoInboxClientConfig): ResolvedMemoInboxClientConfig {
  const baseUrl = String(config.baseUrl || "").trim().replace(/\/+$/, "");
  const bearerToken = String(config.bearerToken || "").trim();

  if (!baseUrl) {
    throw createApiError("baseUrl is required", "INVALID_CONFIG", 500);
  }

  if (!bearerToken) {
    throw createApiError("bearerToken is required", "INVALID_CONFIG", 500);
  }

  const fetchImpl = config.fetch ?? globalThis.fetch.bind(globalThis);

  if (typeof fetchImpl !== "function") {
    throw createApiError("fetch implementation is required", "INVALID_CONFIG", 500);
  }

  return {
    baseUrl,
    bearerToken,
    fetch: fetchImpl,
    headers: config.headers
  };
}

export function createApiClient(config: MemoInboxClientConfig) {
  const resolved = resolveMemoInboxClientConfig(config);

  return {
    memos: {
      create: (input: CreateMemoInput) =>
        requestJson<MemoDto>(resolved, "/memos", {
          method: "POST",
          body: buildCreateMemoBody(input)
        }),
      get: (memoId: string) => requestJson<MemoDto>(resolved, `/memos/${encodeURIComponent(memoId)}`),
      update: (memoId: string, input: UpdateMemoInput) =>
        requestJson<MemoDto>(resolved, `/memos/${encodeURIComponent(memoId)}`, {
          method: "PATCH",
          body: input
        }),
      remove: (memoId: string) =>
        requestJson<void>(resolved, `/memos/${encodeURIComponent(memoId)}`, {
          method: "DELETE"
        }),
      restore: (memoId: string) =>
        requestJson<MemoDto>(resolved, `/memos/${encodeURIComponent(memoId)}/restore`, {
          method: "POST"
        }),
      purge: (memoId: string) =>
        requestJson<void>(resolved, `/memos/${encodeURIComponent(memoId)}/purge`, {
          method: "DELETE"
        }),
      list: (input: { limit?: number; cursor?: string } = {}) =>
        requestJson<MemoListResponse>(resolved, "/memos", {
          query: {
            limit: input.limit,
            cursor: input.cursor
          }
        })
    },
    trash: {
      list: () => requestJson<{ items: MemoDto[] }>(resolved, "/trash")
    },
    search: {
      query: (input: SearchMemosInput = {}) =>
        requestJson<MemoSearchResponse>(resolved, "/search", {
          query: {
            q: input.q,
            tag: input.tag,
            from: input.from,
            to: input.to,
            limit: input.limit
          }
        })
    },
    review: {
      random: () => requestJson<MemoDto>(resolved, "/review/random"),
      daily: () => requestJson<MemoReviewDailyResponse>(resolved, "/review/daily")
    },
    imports: {
      create: (input: CreateImportTaskInput) =>
        requestJson<MemoTaskAcceptedResponse>(resolved, "/imports", {
          method: "POST",
          body: input
        })
    },
    tasks: {
      get: (taskId: string) => requestJson<MemoTaskDto>(resolved, `/tasks/${encodeURIComponent(taskId)}`),
      getErrors: (taskId: string) =>
        requestJson<MemoTaskErrorsResponse>(resolved, `/tasks/${encodeURIComponent(taskId)}/errors`),
      cancel: (taskId: string) =>
        requestJson<MemoTaskDto>(resolved, `/tasks/${encodeURIComponent(taskId)}/cancel`, {
          method: "POST"
        })
    },
    maintenance: {
      getStatus: () => requestJson<MemoMaintenanceStatus>(resolved, "/maintenance/status"),
      reindex: () =>
        requestJson<MemoTaskAcceptedResponse>(resolved, "/maintenance/reindex", {
          method: "POST"
        }),
      reconcile: () =>
        requestJson<MemoTaskAcceptedResponse>(resolved, "/maintenance/reconcile", {
          method: "POST"
        })
    },
    system: {
      getStatus: () => requestJson<MemoSystemStatus>(resolved, "/status")
    }
  };
}

export function createTaskEventClient(config: TaskEventClientConfig) {
  const resolved = resolveTaskEventClientConfig(config);
  const listeners = new Map<MemoTaskEventType, Set<TaskEventListener>>();
  const stateListeners = new Set<StateChangeListener>();
  const errorListeners = new Set<ErrorListener>();
  const subscribedTaskIds = new Set<string>();
  let socket: WebSocket | null = null;
  let connectionState: ConnectionState = "idle";
  let reconnectAttempts = 0;
  let manualClose = false;
  let connectPromise: Promise<void> | null = null;
  let pendingConnectReject: ((error: AppError) => void) | null = null;
  const api = {
    connect: connectSocket,
    disconnect() {
      manualClose = true;
      connectPromise = null;
      pendingConnectReject = null;
      connectionState = "closed";
      socket?.close();
      socket = null;
    },
    subscribeTask(taskId: string) {
      subscribedTaskIds.add(taskId);
      sendTaskMessage("memo_subscribe_task", taskId);
    },
    unsubscribeTask(taskId: string) {
      subscribedTaskIds.delete(taskId);
      sendTaskMessage("memo_unsubscribe_task", taskId);
    },
    on(eventType: MemoTaskEventType, listener: TaskEventListener) {
      const bucket = listeners.get(eventType) ?? new Set<TaskEventListener>();
      bucket.add(listener);
      listeners.set(eventType, bucket);
    },
    off(eventType: MemoTaskEventType, listener: TaskEventListener) {
      const bucket = listeners.get(eventType);
      if (!bucket) {
        return;
      }

      bucket.delete(listener);
      if (bucket.size === 0) {
        listeners.delete(eventType);
      }
    },
    onStateChange(listener: StateChangeListener) {
      stateListeners.add(listener);
    },
    offStateChange(listener: StateChangeListener) {
      stateListeners.delete(listener);
    },
    onError(listener: ErrorListener) {
      errorListeners.add(listener);
    },
    offError(listener: ErrorListener) {
      errorListeners.delete(listener);
    },
    getConnectionState() {
      return connectionState;
    }
  };

  return api;

  async function connectSocket() {
    if (connectionState === "open") {
      return;
    }

    if (connectPromise) {
      return await connectPromise;
    }

    manualClose = false;
    updateConnectionState("connecting");

    connectPromise = new Promise<void>((resolve, reject) => {
      pendingConnectReject = reject;
      const instance = new resolved.WebSocket(buildTaskEventUrl(resolved.baseUrl, resolved.vcpKey));
      socket = instance;

      instance.onopen = () => {
        updateConnectionState("open");
        reconnectAttempts = 0;
        replaySubscriptions();
        pendingConnectReject = null;
        resolve();
        connectPromise = null;
      };

      instance.onmessage = (message) => {
        try {
          const event = JSON.parse(String(message.data)) as MemoTaskEvent;
          dispatchEvent(event);
        } catch (error) {
          dispatchSocketError(error);
        }
      };

      instance.onerror = (event) => {
        dispatchSocketError(event);
      };

      instance.onclose = () => {
        socket = null;
        updateConnectionState("closed");
        const shouldRejectPendingConnect = connectionState !== "open" && pendingConnectReject !== null;
        const rejectPendingConnect = pendingConnectReject;
        connectPromise = null;
        pendingConnectReject = null;

        if (shouldRejectPendingConnect && rejectPendingConnect) {
          rejectPendingConnect(createApiError("Socket connection failed", "SOCKET_ERROR", 500));
        }

        if (!manualClose) {
          scheduleReconnect();
        }
      };
    });

    return await connectPromise;
  }

  function sendTaskMessage(type: "memo_subscribe_task" | "memo_unsubscribe_task", taskId: string) {
    if (!socket || connectionState !== "open") {
      return;
    }

    socket.send(
      JSON.stringify({
        type,
        data: {
          taskId
        }
      })
    );
  }

  function replaySubscriptions() {
    for (const taskId of subscribedTaskIds) {
      sendTaskMessage("memo_subscribe_task", taskId);
    }
  }

  function dispatchEvent(event: MemoTaskEvent) {
    const bucket = listeners.get(event.type);
    if (!bucket) {
      return;
    }

    for (const listener of bucket) {
      listener(event);
    }
  }

  function dispatchSocketError(error: unknown) {
    for (const listener of errorListeners) {
      listener(error);
    }
  }

  function updateConnectionState(state: ConnectionState) {
    connectionState = state;

    for (const listener of stateListeners) {
      listener(state);
    }
  }

  function scheduleReconnect() {
    if (!resolved.reconnectEnabled) {
      return;
    }

    if (reconnectAttempts >= resolved.reconnectMaxAttempts) {
      return;
    }

    reconnectAttempts += 1;
    setTimeout(() => {
      if (manualClose || connectionState === "open" || connectionState === "connecting") {
        return;
      }

      void api.connect();
    }, resolved.reconnectDelayMs);
  }
}

export function createApiError(
  message = "Unknown API error",
  code = "API_CLIENT_ERROR",
  status = 500,
  cause?: unknown
): AppError {
  return {
    code,
    message,
    status,
    cause
  };
}

async function requestJson<T>(
  config: ResolvedMemoInboxClientConfig,
  path: string,
  options: {
    method?: string;
    body?: BodyInit | JsonBody;
    query?: Record<string, QueryValue>;
  } = {}
): Promise<T> {
  const url = buildApiUrl(config.baseUrl, path, options.query);
  const headers = new Headers(config.headers);

  headers.set("Accept", "application/json");
  headers.set("Authorization", `Bearer ${config.bearerToken}`);

  const init: RequestInit = {
    method: options.method ?? "GET",
    headers
  };

  if (options.body !== undefined) {
    if (options.body instanceof FormData) {
      init.body = options.body;
      headers.delete("Content-Type");
    } else if (typeof options.body === "string" || options.body instanceof Blob) {
      init.body = options.body;
    } else {
      headers.set("Content-Type", "application/json");
      init.body = JSON.stringify(options.body);
    }
  }

  let response: Response;

  try {
    response = await config.fetch(url, init);
  } catch (error) {
    throw createApiError("Network request failed", "NETWORK_ERROR", 500, error);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const data = parseResponseText(text);

  if (!response.ok) {
    throw toAppError(data, response.status);
  }

  return data as T;
}

function buildApiUrl(baseUrl: string, path: string, query?: Record<string, QueryValue>) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${baseUrl}/api/plugins/MemoInboxAPI${normalizedPath}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") {
        continue;
      }

      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

function buildCreateMemoBody(input: CreateMemoInput): FormData | Record<string, unknown> {
  if (input.formData) {
    return input.formData;
  }

  if (input.files && input.files.length > 0) {
    const formData = new FormData();
    formData.set("content", input.content);

    if (input.tags) {
      formData.set("tags", JSON.stringify(input.tags));
    }

    if (input.source) {
      formData.set("source", input.source);
    }

    if (input.imageUrls) {
      formData.set("imageUrls", JSON.stringify(input.imageUrls));
    }

    if (input.imageBase64) {
      formData.set("imageBase64", JSON.stringify(input.imageBase64));
    }

    for (const file of input.files) {
      formData.append("files", file);
    }

    return formData;
  }

  return {
    content: input.content,
    tags: input.tags,
    source: input.source,
    imageUrls: input.imageUrls,
    imageBase64: input.imageBase64
  };
}

function parseResponseText(text: string): unknown {
  if (!text.trim()) {
    return undefined;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw createApiError("Invalid JSON response", "INVALID_RESPONSE", 500, error);
  }
}

function toAppError(data: unknown, status: number): AppError {
  const payload = data as ApiErrorPayload | undefined;

  if (payload?.error?.code && payload.error.message) {
    return createApiError(payload.error.message, payload.error.code, payload.error.status, data);
  }

  return createApiError(`HTTP request failed with status ${status}`, "HTTP_ERROR", status, data);
}

function resolveTaskEventClientConfig(config: TaskEventClientConfig): ResolvedTaskEventClientConfig {
  const baseUrl = String(config.baseUrl || "").trim().replace(/\/+$/, "");
  const vcpKey = String(config.vcpKey || "").trim();
  const WebSocketImpl = config.WebSocket ?? globalThis.WebSocket;

  if (!baseUrl) {
    throw createApiError("baseUrl is required", "INVALID_CONFIG", 500);
  }

  if (!vcpKey) {
    throw createApiError("vcpKey is required", "INVALID_CONFIG", 500);
  }

  if (typeof WebSocketImpl !== "function") {
    throw createApiError("WebSocket implementation is required", "INVALID_CONFIG", 500);
  }

  return {
    baseUrl,
    vcpKey,
    WebSocket: WebSocketImpl,
    reconnectEnabled: config.reconnect?.enabled ?? false,
    reconnectMaxAttempts: config.reconnect?.maxAttempts ?? 3,
    reconnectDelayMs: config.reconnect?.delayMs ?? 1_000
  };
}

function buildTaskEventUrl(baseUrl: string, vcpKey: string) {
  const parsed = new URL(baseUrl);
  const protocol = parsed.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${parsed.host}/vcp-memo-inbox/VCP_Key=${encodeURIComponent(vcpKey)}`;
}

export * from "./hooks";

