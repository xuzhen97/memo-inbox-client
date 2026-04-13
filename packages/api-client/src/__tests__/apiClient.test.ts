import { describe, expect, it, vi } from "vitest";

import { createApiClient } from "../index";
import { invalidateMemoQueries } from "../hooks";

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json"
    },
    ...init
  });
}

function getHeader(headers: HeadersInit | undefined, name: string) {
  return new Headers(headers).get(name);
}

describe("createApiClient", () => {
  it("normalizes baseUrl and injects bearer auth headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ items: [], nextCursor: null }));
    const client = createApiClient({
      baseUrl: "http://localhost:3030/",
      bearerToken: "secret",
      fetch: fetchMock
    });

    await client.memos.list({ limit: 10, cursor: "memo-1" });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(url).toBe("http://localhost:3030/api/plugins/MemoInboxAPI/memos?limit=10&cursor=memo-1");
    expect(init.method).toBe("GET");
    expect(getHeader(init.headers, "Authorization")).toBe("Bearer secret");
    expect(getHeader(init.headers, "Accept")).toBe("application/json");
  });

  it("returns undefined for 204 responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 204
      })
    );
    const client = createApiClient({
      baseUrl: "http://localhost:3030",
      bearerToken: "secret",
      fetch: fetchMock
    });

    await expect(client.memos.remove("memo_1")).resolves.toBeUndefined();
  });

  it("maps standard api error payloads into AppError objects", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: "MEMO_NOT_FOUND",
            message: "memo not found",
            status: 404
          }
        },
        { status: 404 }
      )
    );
    const client = createApiClient({
      baseUrl: "http://localhost:3030",
      bearerToken: "secret",
      fetch: fetchMock
    });

    await expect(client.memos.get("missing")).rejects.toMatchObject({
      code: "MEMO_NOT_FOUND",
      message: "memo not found",
      status: 404
    });
  });

  it("sends JSON bodies for memo creation without files", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ memoId: "memo_1" }));
    const client = createApiClient({
      baseUrl: "http://localhost:3030",
      bearerToken: "secret",
      fetch: fetchMock
    });

    await client.memos.create({
      content: "hello",
      tags: ["memo", "sdk"],
      source: "api",
      imageUrls: ["https://example.com/image.png"],
      imageBase64: ["data:image/png;base64,AAAA"]
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(url).toBe("http://localhost:3030/api/plugins/MemoInboxAPI/memos");
    expect(init.method).toBe("POST");
    expect(getHeader(init.headers, "Content-Type")).toBe("application/json");
    expect(JSON.parse(String(init.body))).toEqual({
      content: "hello",
      tags: ["memo", "sdk"],
      source: "api",
      imageUrls: ["https://example.com/image.png"],
      imageBase64: ["data:image/png;base64,AAAA"]
    });
  });

  it("sends multipart bodies for memo creation with files", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ memoId: "memo_2" }));
    const client = createApiClient({
      baseUrl: "http://localhost:3030",
      bearerToken: "secret",
      fetch: fetchMock
    });

    await client.memos.create({
      content: "hello",
      tags: ["memo"],
      files: [new File(["img"], "memo.png", { type: "image/png" })]
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const formData = init.body as FormData;

    expect(formData).toBeInstanceOf(FormData);
    expect(formData.get("content")).toBe("hello");
    expect(formData.get("tags")).toBe("[\"memo\"]");
    expect(formData.getAll("files")).toHaveLength(1);
    expect(getHeader(init.headers, "Content-Type")).toBeNull();
  });

  it("sends multipart bodies for memo updates with attachment changes", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ memoId: "memo_2" }));
    const client = createApiClient({
      baseUrl: "http://localhost:3030",
      bearerToken: "secret",
      fetch: fetchMock
    });

    await client.memos.update("memo_2", {
      content: "updated",
      tags: ["memo", "edited"],
      keepAttachmentUrls: ["https://example.com/kept.png"],
      files: [new File(["img"], "new.png", { type: "image/png" })]
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const formData = init.body as FormData;

    expect(init.method).toBe("PATCH");
    expect(formData).toBeInstanceOf(FormData);
    expect(formData.get("content")).toBe("updated");
    expect(formData.get("tags")).toBe("[\"memo\",\"edited\"]");
    expect(formData.get("keepAttachmentUrls")).toBe("[\"https://example.com/kept.png\"]");
    expect(formData.getAll("files[]")).toHaveLength(1);
    expect(getHeader(init.headers, "Content-Type")).toBeNull();
  });

  it("sends JSON bodies for memo updates without attachment changes", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ memoId: "memo_2" }));
    const client = createApiClient({
      baseUrl: "http://localhost:3030",
      bearerToken: "secret",
      fetch: fetchMock
    });

    await client.memos.update("memo_2", {
      content: "updated",
      tags: ["memo", "edited"]
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(init.method).toBe("PATCH");
    expect(getHeader(init.headers, "Content-Type")).toBe("application/json");
    expect(JSON.parse(String(init.body))).toEqual({
      content: "updated",
      tags: ["memo", "edited"]
    });
  });

  it("routes CRUD, search, review, import, task, maintenance and status requests to the expected endpoints", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ memoId: "memo_1" }))
      .mockResolvedValueOnce(jsonResponse({ memoId: "memo_1" }))
      .mockResolvedValueOnce(jsonResponse({ memoId: "memo_1" }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(jsonResponse({ memoId: "memo_1" }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(jsonResponse({ items: [], nextCursor: null }))
      .mockResolvedValueOnce(jsonResponse({ items: [] }))
      .mockResolvedValueOnce(jsonResponse({ items: [] }))
      .mockResolvedValueOnce(jsonResponse({ memoId: "memo_2" }))
      .mockResolvedValueOnce(jsonResponse({ memoId: "memo_3", reviewReason: "earliest_memo_for_daily_review" }))
      .mockResolvedValueOnce(jsonResponse({ taskId: "task_1", status: "accepted", statusUrl: "/tasks/task_1" }, { status: 202 }))
      .mockResolvedValueOnce(jsonResponse({ taskId: "task_1", status: "running", progress: 10 }))
      .mockResolvedValueOnce(jsonResponse({ taskId: "task_1", errors: [] }))
      .mockResolvedValueOnce(jsonResponse({ taskId: "task_1", status: "cancelled", progress: 10 }))
      .mockResolvedValueOnce(jsonResponse({ memoCount: 1, trashCount: 0, attachmentCount: 0, indexCount: 1, taskSummary: { total: 0, accepted: 0, running: 0, completed: 0, failed: 0, cancelled: 0 }, paths: { memoRootPath: "a", memoTrashPath: "b", memoImageRootPath: "c" } }))
      .mockResolvedValueOnce(jsonResponse({ taskId: "task_2", status: "accepted", statusUrl: "/tasks/task_2" }, { status: 202 }))
      .mockResolvedValueOnce(jsonResponse({ taskId: "task_3", status: "accepted", statusUrl: "/tasks/task_3" }, { status: 202 }))
      .mockResolvedValueOnce(jsonResponse({ status: "ok", plugin: "MemoInboxAPI", memoDiaryName: "MyMemos", imageServerKeyConfigured: true }));
    const client = createApiClient({
      baseUrl: "http://localhost:3030",
      bearerToken: "secret",
      fetch: fetchMock
    });

    await client.memos.get("memo_1");
    await client.memos.update("memo_1", { content: "updated", tags: ["sdk"] });
    await client.memos.remove("memo_1");
    await client.memos.restore("memo_1");
    await client.memos.purge("memo_1");
    await client.memos.list({ limit: 20 });
    await client.trash.list();
    await client.search.query({ q: "hello", tag: "sdk", from: "2026-04-01", to: "2026-04-11", limit: 5 });
    await client.review.random();
    await client.review.daily();
    await client.imports.create({
      items: [{ content: "imported" }],
      mode: "insert"
    });
    await client.tasks.get("task_1");
    await client.tasks.getErrors("task_1");
    await client.tasks.cancel("task_1");
    await client.maintenance.getStatus();
    await client.maintenance.reindex();
    await client.maintenance.reconcile();
    await client.system.getStatus();

    const calls = fetchMock.mock.calls as Array<[string, RequestInit]>;

    expect(calls[0][0]).toBe("http://localhost:3030/api/plugins/MemoInboxAPI/memos/memo_1");
    expect(calls[1][0]).toBe("http://localhost:3030/api/plugins/MemoInboxAPI/memos/memo_1");
    expect(calls[1][1].method).toBe("PATCH");
    expect(calls[2][0]).toBe("http://localhost:3030/api/plugins/MemoInboxAPI/memos/memo_1");
    expect(calls[2][1].method).toBe("DELETE");
    expect(calls[3][0]).toBe("http://localhost:3030/api/plugins/MemoInboxAPI/memos/memo_1/restore");
    expect(calls[3][1].method).toBe("POST");
    expect(calls[4][0]).toBe("http://localhost:3030/api/plugins/MemoInboxAPI/memos/memo_1/purge");
    expect(calls[4][1].method).toBe("DELETE");
    expect(calls[5][0]).toBe("http://localhost:3030/api/plugins/MemoInboxAPI/memos?limit=20");
    expect(calls[6][0]).toBe("http://localhost:3030/api/plugins/MemoInboxAPI/trash");
    expect(calls[7][0]).toBe(
      "http://localhost:3030/api/plugins/MemoInboxAPI/search?q=hello&tag=sdk&from=2026-04-01&to=2026-04-11&limit=5"
    );
    expect(calls[8][0]).toBe("http://localhost:3030/api/plugins/MemoInboxAPI/review/random");
    expect(calls[9][0]).toBe("http://localhost:3030/api/plugins/MemoInboxAPI/review/daily");
    expect(calls[10][0]).toBe("http://localhost:3030/api/plugins/MemoInboxAPI/imports");
    expect(calls[11][0]).toBe("http://localhost:3030/api/plugins/MemoInboxAPI/tasks/task_1");
    expect(calls[12][0]).toBe("http://localhost:3030/api/plugins/MemoInboxAPI/tasks/task_1/errors");
    expect(calls[13][0]).toBe("http://localhost:3030/api/plugins/MemoInboxAPI/tasks/task_1/cancel");
    expect(calls[13][1].method).toBe("POST");
    expect(calls[14][0]).toBe("http://localhost:3030/api/plugins/MemoInboxAPI/maintenance/status");
    expect(calls[15][0]).toBe("http://localhost:3030/api/plugins/MemoInboxAPI/maintenance/reindex");
    expect(calls[15][1].method).toBe("POST");
    expect(calls[16][0]).toBe("http://localhost:3030/api/plugins/MemoInboxAPI/maintenance/reconcile");
    expect(calls[16][1].method).toBe("POST");
    expect(calls[17][0]).toBe("http://localhost:3030/api/plugins/MemoInboxAPI/status");
  });

  it("invalidates memo detail, list and search queries after remove succeeds", async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);
    const queryClient = {
      invalidateQueries,
    };

    invalidateMemoQueries(queryClient, "memo_1");

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["memos", "detail", "memo_1"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["memos", "list"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["memos", "search"] });
  });
});
