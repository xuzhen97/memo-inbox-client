export interface AppError {
  code: string;
  message: string;
  status: number;
  cause?: unknown;
}

export interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
    status: number;
  };
}

export interface MarkdownDocument {
  markdown: string;
  updatedAt?: string;
}

export interface AttachmentRef {
  id: string;
  source: string;
  name: string;
  mimeType?: string;
}

export interface MemoInboxClientConfig {
  baseUrl: string;
  bearerToken: string;
  fetch?: typeof fetch;
  headers?: HeadersInit;
}

export interface TaskEventReconnectOptions {
  enabled?: boolean;
  maxAttempts?: number;
  delayMs?: number;
}

export interface TaskEventClientConfig {
  baseUrl: string;
  vcpKey: string;
  WebSocket?: typeof WebSocket;
  reconnect?: TaskEventReconnectOptions;
}

export interface AppSettings {
  serviceBaseUrl: string;
  serviceToken: string;
  socketBaseUrl: string;
  socketVcpKey: string;
}

export interface PlatformBridge {
  getPlatformInfo(): Promise<{
    kind: string;
    runtime: string;
    target?: string;
  }>;
  saveDraft(key: string, payload: MarkdownDocument): Promise<void>;
  loadDraft(key: string): Promise<MarkdownDocument | null>;
  removeDraft(key: string): Promise<void>;
  getStorageItem(key: string): Promise<string | null>;
  setStorageItem(key: string, value: string): Promise<void>;
}

export interface MemoHeader {
  date: string;
  maidName: string;
}

export interface MemoAttachment {
  imageId: string;
  url: string;
  mimeType: string;
  relativePath: string;
}

export interface MemoMeta {
  memoId: string;
  source?: string;
  [key: string]: string | undefined;
}

export interface MemoDto {
  memoId: string;
  header: MemoHeader;
  content: string;
  attachments: MemoAttachment[];
  tags: string[];
  meta: MemoMeta;
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
  filename: string;
}

export interface MemoListResponse {
  items: MemoDto[];
  nextCursor: string | null;
}

export interface MemoTrashResponse {
  items: MemoDto[];
}

export interface MemoSearchResponse {
  items: MemoDto[];
}

export interface MemoReviewDailyResponse extends MemoDto {
  reviewReason: string;
}

export type MemoTaskStatus = "accepted" | "running" | "completed" | "failed" | "cancelled";

export interface MemoTaskErrorItem {
  index?: number;
  externalId?: string | null;
  error: string;
}

export interface MemoTaskDto {
  taskId: string;
  type: string;
  status: MemoTaskStatus;
  progress: number;
  message: string;
  result: unknown;
  error: MemoTaskErrorItem[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface MemoTaskAcceptedResponse {
  taskId: string;
  status: MemoTaskStatus;
  statusUrl: string;
}

export interface MemoTaskErrorsResponse {
  taskId: string;
  errors: MemoTaskErrorItem[];
}

export type MemoTaskEventType =
  | "memo_task_accepted"
  | "memo_task_progress"
  | "memo_task_completed"
  | "memo_task_failed"
  | "memo_task_cancelled";

export interface MemoTaskEvent {
  type: MemoTaskEventType;
  data: {
    taskId: string;
    taskType: string;
    status: MemoTaskStatus;
    progress: number;
    message: string;
    result: unknown;
    error: MemoTaskErrorItem[] | null;
    createdAt: string;
    updatedAt: string;
  };
}

export interface MemoTaskSummary {
  total: number;
  accepted: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
}

export interface MemoMaintenanceStatus {
  memoCount: number;
  trashCount: number;
  attachmentCount: number;
  indexCount: number;
  taskSummary: MemoTaskSummary;
  paths: {
    memoRootPath: string;
    memoTrashPath: string;
    memoImageRootPath: string;
  };
}

export interface MemoSystemStatus {
  status: string;
  plugin: string;
  memoDiaryName: string;
  imageServerKeyConfigured: boolean;
}

export interface CreateMemoInput {
  content: string;
  tags?: string[];
  source?: string;
  imageUrls?: string[];
  imageBase64?: string[];
  files?: File[];
  formData?: FormData;
}

export interface UpdateMemoInput {
  content?: string;
  tags?: string[];
  keepAttachmentUrls?: string[];
  files?: File[];
}

export interface ListMemosInput {
  limit?: number;
  cursor?: string;
}

export interface SearchMemosInput {
  q?: string;
  tag?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export interface ImportMemoItemInput {
  content: string;
  tags?: string[];
  images?: string[];
  externalId?: string;
  createdAt?: string;
}

export interface CreateImportTaskInput {
  items: ImportMemoItemInput[];
  mode?: "insert" | "upsert" | "skip_duplicates";
}
