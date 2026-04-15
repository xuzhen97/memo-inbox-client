import { describe, expectTypeOf, it } from "vitest";

import type {
  CreateImportTaskInput,
  ListMemosInput,
  CreateMemoInput,
  MemoDto,
  MemoInboxClientConfig,
  MemoListResponse,
  MemoSystemStatus,
  MemoTaskAcceptedResponse,
  MemoTaskDto,
  MemoTaskEvent,
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

    expectTypeOf<ListMemosInput>().toMatchTypeOf<{
      q?: string;
      limit?: number;
    }>();

    expectTypeOf<MemoListResponse>().toMatchTypeOf<{
      items: MemoDto[];
      nextCursor: string | null;
      total: number;
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

    expectTypeOf<MemoSystemStatus>().toMatchTypeOf<{
      status: string;
      plugin: string;
    }>();
  });
});
