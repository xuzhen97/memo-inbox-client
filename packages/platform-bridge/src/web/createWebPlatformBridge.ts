import type { PlatformBridge } from "@memo-inbox/shared-types";
import JSZip from "jszip";
import { createMemoryDraftStore } from "../core/createMemoryDraftStore";

export interface ParsedFlomoImportItem {
  content: string;
  tags?: string[];
  images?: string[];
  externalId: string;
  createdAt: string;
}

export async function parseFlomoExportZip(zipSource: Blob | ArrayBuffer | Uint8Array): Promise<ParsedFlomoImportItem[]> {
  const zip = await JSZip.loadAsync(zipSource);
  const items: ParsedFlomoImportItem[] = [];
  const parser = new DOMParser();

  const htmlFiles = Object.keys(zip.files).filter((name) => name.endsWith(".html"));

  for (const fileName of htmlFiles) {
    const htmlContent = await zip.files[fileName].async("string");
    const doc = parser.parseFromString(htmlContent, "text/html");

    const memos = doc.querySelectorAll("div.memo");
    for (const memo of Array.from(memos)) {
      const contentEl = memo.querySelector("div.content");
      const timeEl = memo.querySelector("div.time");

      const content = contentEl?.textContent?.trim() || "";
      if (!content) {
        continue;
      }

      const createdAt = timeEl?.textContent?.trim() || "";

      const tags: string[] = [];
      const words = content.split(/\s+/);
      for (const word of words) {
        if (word.startsWith("#") && word.length > 1) {
          tags.push(word.substring(1));
        }
      }

      const images: string[] = [];
      const imgEls = memo.querySelectorAll("img");
      for (const img of Array.from(imgEls)) {
        const src = img.getAttribute("src");
        if (!src) {
          continue;
        }

        const htmlDir = fileName.split("/").slice(0, -1).join("/");
        const imagePath = htmlDir ? `${htmlDir}/${src}` : src;

        const zipFile = zip.files[imagePath] || zip.files[src];
        if (!zipFile) {
          continue;
        }

        const base64 = await zipFile.async("base64");
        const ext = imagePath.split(".").pop()?.toLowerCase();
        const mime =
          ext === "png"
            ? "image/png"
            : ext === "gif"
              ? "image/gif"
              : ext === "webp"
                ? "image/webp"
                : "image/jpeg";
        images.push(`data:${mime};base64,${base64}`);
      }

      const source = `${createdAt}${content}`;
      let hash = 0;
      for (let i = 0; i < source.length; i += 1) {
        const char = source.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
      }

      items.push({
        content,
        tags: tags.length > 0 ? tags : undefined,
        images: images.length > 0 ? images : undefined,
        externalId: hash.toString(16),
        createdAt,
      });
    }
  }

  return items;
}

export function createWebPlatformBridge(): PlatformBridge {
  const draftStore = createMemoryDraftStore();

  return {
    async getPlatformInfo() {
      return {
        kind: "web",
        runtime: "browser"
      };
    },
    saveDraft: draftStore.saveDraft,
    loadDraft: draftStore.loadDraft,
    removeDraft: draftStore.removeDraft,
    async getStorageItem(key) {
      return localStorage.getItem(key);
    },
    async setStorageItem(key, value) {
      localStorage.setItem(key, value);
    },
    async invokeCommand() {
      console.warn("invokeCommand is not implemented for Web");
      throw new Error("NOT_IMPLEMENTED");
    },
    async showOpenDialog() {
      console.warn("showOpenDialog is not implemented for Web");
      return null;
    },
    async importFlomoExport() {
      // 1. Trigger file selection
      const file = await new Promise<File | null>((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".zip";
        input.onchange = () => {
          resolve(input.files?.[0] || null);
        };
        input.click();
      });

      if (!file) return null;

      return parseFlomoExportZip(file);
    }
  };
}
