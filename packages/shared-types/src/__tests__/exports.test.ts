import { describe, expectTypeOf, it } from "vitest";

import type {
  CreateImportTaskInput,
  CreateMemoInput,
  MemoDto,
  MemoInboxClientConfig,
  MemoMaintenanceStatus,
  MemoSystemStatus,
  MemoTaskAcceptedResponse,
  MemoTaskDto,
  MemoTaskEvent,
  SearchMemosInput,
  TaskEventClientConfig,
  UpdateMemoInput
} from "../index";

describe("shared types exports", () => {
  it("exposes memo inbox sdk contract types", () => {
    expectTypeOf<MemoInboxClientConfig>().toMatchTypeOf<{
      baseUrl: string;
      bearerToken: string;
    }>();

    expectTypeOf<TaskEventClientConfig>().toMatchTypeOf<{
      baseUrl: string;
      vcpKey: string;
    }>();

    expectTypeOf<CreateMemoInput>().toMatchTypeOf<{
      content: string;
    }>();

    expectTypeOf<UpdateMemoInput>().toMatchTypeOf<{
      content?: string;
      tags?: string[];
    }>();

    expectTypeOf<SearchMemosInput>().toMatchTypeOf<{
      q?: string;
      limit?: number;
    }>();

    expectTypeOf<CreateImportTaskInput>().toMatchTypeOf<{
      items: Array<{ content: string }>;
    }>();

    expectTypeOf<MemoDto>().toMatchTypeOf<{
      memoId: string;
      content: string;
      tags: string[];
      attachments: Array<{ url: string }>;
    }>();

    expectTypeOf<MemoTaskDto>().toMatchTypeOf<{
      taskId: string;
      status: string;
      progress: number;
    }>();

    expectTypeOf<MemoTaskAcceptedResponse>().toMatchTypeOf<{
      taskId: string;
      status: string;
      statusUrl: string;
    }>();

    expectTypeOf<MemoTaskEvent>().toMatchTypeOf<{
      type: string;
      data: { taskId: string };
    }>();

    expectTypeOf<MemoMaintenanceStatus>().toMatchTypeOf<{
      memoCount: number;
      taskSummary: { total: number };
    }>();

    expectTypeOf<MemoSystemStatus>().toMatchTypeOf<{
      status: string;
      plugin: string;
    }>();
  });
});
