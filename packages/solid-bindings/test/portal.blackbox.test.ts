import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createSession, type TerminalSession } from "@tui/test-harness";

const fixture = new URL("./fixtures/portal.tsx", import.meta.url).pathname;
const packageRoot = new URL("..", import.meta.url).pathname;

describe("portal blackbox", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 80, rows: 24, cwd: packageRoot });
  });

  afterEach(() => {
    session.cleanup();
  });

  test("renders portal content at the root without affecting inline flow", async () => {
    await session.spawn("bun", [fixture]);

    expect(await session.waitForText("Top marker", 2000)).toBe(true);
    expect(await session.waitForText("Bottom marker", 2000)).toBe(true);
    expect(await session.waitForText("PORTAL MODAL", 2000)).toBe(true);

    const top = session.findText("Top marker");
    const bottom = session.findText("Bottom marker");
    const modal = session.findText("PORTAL MODAL");

    expect(top).not.toBeNull();
    expect(bottom).not.toBeNull();
    expect(modal).not.toBeNull();

    expect(top!.row).toBeLessThan(bottom!.row);
    expect(bottom!.row).toBeLessThanOrEqual(4);
    expect(modal!.row).toBeGreaterThanOrEqual(8);
  });
});
