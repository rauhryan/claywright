import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createSession, MouseButton, type TerminalSession } from "@tui/test-harness";

const promiseFixture = new URL("./fixtures/async-repaint-promise.tsx", import.meta.url).pathname;
const timeoutFixture = new URL("./fixtures/async-repaint-timeout.tsx", import.meta.url).pathname;
const eventFixture = new URL("./fixtures/async-event-handler.tsx", import.meta.url).pathname;

describe("async repaint blackbox", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 60, cwd: process.cwd(), rows: 10 });
  });

  afterEach(() => {
    session.cleanup();
  });

  test("promise-driven updates repaint without extra input", async () => {
    await session.spawn("bun", [promiseFixture]);

    expect(await session.waitForText("resolved", 2000)).toBe(true);
  });

  test("timeout-driven updates repaint without extra input", async () => {
    await session.spawn("bun", [timeoutFixture]);

    expect(await session.waitForText("resolved", 2000)).toBe(true);
  });

  test("async click handlers repaint after await without follow-up input", async () => {
    await session.spawn("bun", [eventFixture]);

    expect(await session.waitForText("Event status: idle", 2000)).toBe(true);

    session.mouseMove(3, 2);
    await session.wait(100);
    session.click(3, 2, MouseButton.Left);

    expect(await session.waitForFrameText("pending", { timeout: 2000 })).not.toBeNull();
    expect(await session.waitForText("done", 2000)).toBe(true);
  });
});
