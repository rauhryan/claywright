import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createSession, MouseButton, type TerminalSession } from "@tui/test-harness";

const fixture = new URL("./fixtures/pointer.tsx", import.meta.url).pathname;

describe("pointer blackbox", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 40, cwd: process.cwd(), rows: 10 });
  });

  afterEach(() => {
    session.cleanup();
  });

  test("updates pointer position and button state after mount", async () => {
    await session.spawn("bun", [fixture]);

    expect(await session.waitForText("Pointer: (-1, -1) UP", 2000)).toBe(true);

    session.startVTCapture();
    session.mouseMove(5, 3);
    await session.wait(300);
    expect(session.getVTSequences().join("")).toContain("5, 3) UP");

    session.startVTCapture();
    session.mouseDown(5, 3, MouseButton.Left);
    await session.wait(300);
    expect(session.getVTSequences().join("")).toContain("DOWN");

    session.startVTCapture();
    session.mouseMove(8, 4);
    await session.wait(300);
    const moveWhileDown = session.getVTSequences().join("");
    expect(moveWhileDown).toContain("H8");
    expect(moveWhileDown).toContain("H4");

    session.startVTCapture();
    session.mouseUp(8, 4, MouseButton.Left);
    await session.wait(300);
    expect(session.getVTSequences().join("")).toContain("UP");
  });
});
