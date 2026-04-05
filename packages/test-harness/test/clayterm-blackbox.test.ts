import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { createSession, type TerminalSession } from "../src/index";

const fixture = new URL("./fixtures/clayterm-basic.ts", import.meta.url).pathname;

describe("clayterm blackbox", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 40, rows: 10, cwd: process.cwd() });
  });

  afterEach(() => {
    session.cleanup();
  });

  it("renders initial clayterm frame", async () => {
    await session.spawn("bun", [fixture]);
    let ready = await session.waitForText("Idle", 2000);

    expect(ready).toBe(true);
    expect(session.containsText("Idle")).toBe(true);
    expect(session.isAltScreen()).toBe(false);
  });

  it("updates on hover and click", async () => {
    await session.spawn("bun", [fixture]);
    expect(await session.waitForText("Idle", 2000)).toBe(true);

    session.mouseMove(2, 1);
    expect(await session.waitForText("Hovered", 2000)).toBe(true);

    session.mouseDown(2, 1);
    await session.wait(50);
    session.mouseUp(2, 1);
    expect(await session.waitForText("Clicked", 2000)).toBe(true);
  });
});
