import { describe, expect, it } from "vitest";

import { createWebPlatformBridge } from "../web/createWebPlatformBridge";

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
});
