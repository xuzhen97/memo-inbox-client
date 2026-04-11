export interface AppError {
  code: string;
  message: string;
  status: number;
  cause?: unknown;
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

export interface PlatformBridge {
  getPlatformInfo(): Promise<{
    kind: string;
    runtime: string;
    target?: string;
  }>;
  saveDraft(key: string, payload: MarkdownDocument): Promise<void>;
  loadDraft(key: string): Promise<MarkdownDocument | null>;
  removeDraft(key: string): Promise<void>;
}
