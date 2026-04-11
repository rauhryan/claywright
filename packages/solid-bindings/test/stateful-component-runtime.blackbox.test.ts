import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createSession, type TerminalSession } from "@tui/test-harness";

const fixture = new URL("./fixtures/stateful-component-runtime.tsx", import.meta.url).pathname;

describe("stateful component runtime blackbox", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 50, cwd: process.cwd(), rows: 12 });
  });

  afterEach(() => {
    session.cleanup();
  });

  test("runApp stays interactive with a stateful component and a sibling target", async () => {
    await session.spawn("bun", [fixture]);

    expect(await session.waitForText("Stateful Runtime Demo", 2000)).toBe(true);
    expect(await session.waitForText("Pointer: (-1, -1) UP", 2000)).toBe(true);

    session.mouseMove(1, 5);
    expect(
      await session.waitForTextConvergence("Pointer: (1, 5) UP", { timeout: 2000, settleMs: 100 }),
    ).not.toBeNull();

    session.click(1, 5);
    expect(
      await session.waitForTextConvergence("Status: sibling-click", {
        timeout: 2000,
        settleMs: 100,
      }),
    ).not.toBeNull();

    session.sendInput("\x1b[<65;2;7M");
    expect(
      await session.waitForTextConvergence("Status: viewport-wheel:down@1,6", {
        timeout: 2000,
        settleMs: 100,
      }),
    ).not.toBeNull();
  });
});
