import type { MarkdownDocument } from "@memo-inbox/shared-types";

export interface MemoEditorSession {
  initialDocument: MarkdownDocument;
}

export function createMemoEditor(markdown = ""): MemoEditorSession {
  return {
    initialDocument: {
      markdown
    }
  };
}

export function serializeMarkdown(session: MemoEditorSession): string {
  return session.initialDocument.markdown;
}
