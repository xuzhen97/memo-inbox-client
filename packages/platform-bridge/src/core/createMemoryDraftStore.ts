import type { MarkdownDocument } from "@memo-inbox/shared-types";

export interface DraftStore {
  saveDraft(key: string, payload: MarkdownDocument): Promise<void>;
  loadDraft(key: string): Promise<MarkdownDocument | null>;
  removeDraft(key: string): Promise<void>;
}

export function createMemoryDraftStore(): DraftStore {
  const drafts = new Map<string, MarkdownDocument>();

  return {
    async saveDraft(key, payload) {
      drafts.set(key, payload);
    },
    async loadDraft(key) {
      return drafts.get(key) ?? null;
    },
    async removeDraft(key) {
      drafts.delete(key);
    }
  };
}
