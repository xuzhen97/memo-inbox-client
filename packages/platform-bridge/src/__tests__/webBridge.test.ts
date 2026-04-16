// @vitest-environment jsdom

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { createWebPlatformBridge, parseFlomoExportZip } from "../web/createWebPlatformBridge";

describe("createWebPlatformBridge", () => {
  it("reports web platform info and persists drafts", async () => {
    const bridge = createWebPlatformBridge();
    const draft = {
      markdown: "# Hello"
    };

    await bridge.saveDraft("home", draft);

    await expect(bridge.getPlatformInfo()).resolves.toEqual({
      kind: "web",
      runtime: "browser"
    });
    await expect(bridge.loadDraft("home")).resolves.toEqual(draft);

    await bridge.removeDraft("home");

    await expect(bridge.loadDraft("home")).resolves.toBeNull();
  });

  it("parses the real flomo export zip into importable items", async () => {
    const zipPath = resolve("D:/flomo@徐震-20260415.zip");
    const zipBytes = await readFile(zipPath);

    const items = await parseFlomoExportZip(zipBytes);

    expect(items.length).toBeGreaterThan(843);
    expect(items.every((item) => item.content.trim().length > 0)).toBe(true);
    expect(items.every((item) => typeof item.externalId === "string" && item.externalId.length > 0)).toBe(true);

    const emptyCreatedAtItems = items.filter((item) => item.createdAt.trim().length === 0);
    expect(emptyCreatedAtItems).toEqual([]);

    const suspiciousItems = items.filter((item) => {
      const hasInvalidTag = item.tags?.some((tag) => tag.trim().length === 0) ?? false;
      const hasInvalidImage = item.images?.some((image) => !image.startsWith("data:image/")) ?? false;
      return hasInvalidTag || hasInvalidImage;
    });
    expect(suspiciousItems).toEqual([]);
  }, 120_000);

  it("feeds the real flomo export items through import service without service-level failures", async () => {
    const zipPath = resolve("D:/flomo@徐震-20260415.zip");
    const zipBytes = await readFile(zipPath);
    const items = await parseFlomoExportZip(zipBytes);

    const { createTaskRegistry } = await import("../../../../../VCPToolBox/Plugin/MemoInboxAPI/taskRegistry.js");
    const { createImportService } = await import("../../../../../VCPToolBox/Plugin/MemoInboxAPI/importService.js");

    const registry = createTaskRegistry();
    const createdItems: Array<{ content: string; createdAt: Date; attachmentCount: number }> = [];
    const originalSetTimeout = globalThis.setTimeout;

    globalThis.setTimeout = ((handler: TimerHandler, _timeout?: number, ...args: unknown[]) => {
      if (typeof handler === "function") {
        handler(...args);
      }
      return 0 as unknown as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout;

    try {
      const service = createImportService({
        memoStore: {
          async create({
            content,
            createdAt,
            attachments = []
          }: {
            content: string;
            createdAt: Date;
            attachments?: Array<{ url: string }>;
          }) {
            createdItems.push({
              content,
              createdAt,
              attachmentCount: attachments.length
            });

            return {
              memoId: `memo-${createdItems.length}`,
              content,
              createdAt: createdAt.toISOString(),
              attachments: attachments.map((item) => item.url)
            };
          }
        },
        taskRegistry: registry,
        runtimeContext: {},
        storeAttachments: async ({
          inputs
        }: {
          inputs: string[];
        }) => inputs.map((_, index) => ({ url: `/images/mock-${index + 1}.png` })),
        concurrency: 5
      });

      const { taskId, done } = await service.startImport({ items });
      await done;

      const task = registry.getTask(taskId);
      expect(task?.status).toBe("completed");
      expect(task?.result?.imported).toBe(items.length);
      expect(task?.result?.failed).toBe(0);
      expect(task?.error).toBeNull();
      expect(createdItems).toHaveLength(items.length);
    } finally {
      globalThis.setTimeout = originalSetTimeout;
    }
  }, 120_000);
});
