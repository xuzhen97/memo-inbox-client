import type { PlatformBridge } from "@memo-inbox/shared-types";
import JSZip from "jszip";
import { createMemoryDraftStore } from "../core/createMemoryDraftStore";

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

      // 2. Load ZIP
      const zip = await JSZip.loadAsync(file);
      const items: any[] = [];
      const parser = new DOMParser();

      // 3. Find and parse HTML files
      const htmlFiles = Object.keys(zip.files).filter(name => name.endsWith(".html"));

      for (const fileName of htmlFiles) {
        const htmlContent = await zip.files[fileName].async("string");
        const doc = parser.parseFromString(htmlContent, "text/html");
        
        const memos = doc.querySelectorAll("div.memo");
        for (const memo of Array.from(memos)) {
          const contentEl = memo.querySelector("div.content");
          const timeEl = memo.querySelector("div.time");
          
          let content = contentEl?.textContent?.trim() || "";
          if (!content) continue;

          const createdAt = timeEl?.textContent?.trim() || "";

          // Extract tags from content
          const tags: string[] = [];
          const words = content.split(/\s+/);
          for (const word of words) {
            if (word.startsWith("#") && word.length > 1) {
              tags.push(word.substring(1));
            }
          }

          // Extract images
          const images: string[] = [];
          const imgEls = memo.querySelectorAll("img");
          for (const img of Array.from(imgEls)) {
            const src = img.getAttribute("src");
            if (src) {
              // Resolve relative path within ZIP
              // Usually images are in a subfolder like 'file/'
              // The path in HTML is relative to the HTML file
              const htmlDir = fileName.split("/").slice(0, -1).join("/");
              const imagePath = htmlDir ? `${htmlDir}/${src}` : src;
              
              const zipFile = zip.files[imagePath] || zip.files[src];
              if (zipFile) {
                const base64 = await zipFile.async("base64");
                const ext = imagePath.split(".").pop()?.toLowerCase();
                const mime = ext === "png" ? "image/png" : 
                             ext === "gif" ? "image/gif" : 
                             ext === "webp" ? "image/webp" : "image/jpeg";
                images.push(`data:${mime};base64,${base64}`);
              }
            }
          }

          // Generate externalId (matching the logic of timestamp + content hash)
          const source = `${createdAt}${content}`;
          let hash = 0;
          for (let i = 0; i < source.length; i++) {
            const char = source.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0; // Convert to 32bit integer
          }

          items.push({
            content,
            tags: tags.length > 0 ? tags : undefined,
            images: images.length > 0 ? images : undefined,
            external_id: hash.toString(16),
            created_at: createdAt,
          });
        }
      }

      return items;
    }
  };
}
