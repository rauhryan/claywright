import { describe, expect, test } from "bun:test";
import { createSession, MouseButton } from "../src/index";

describe("VT replay", () => {
  test("replaying captured app output preserves in-place redraws", async () => {
    const fixtureSession = createSession({ cols: 70, rows: 16, cwd: process.cwd() });
    const replaySession = createSession({ cols: 70, rows: 16, cwd: process.cwd() });
    const fixture = new URL(
      "../../solid-bindings/test/fixtures/click-counter-manual.ts",
      import.meta.url,
    ).pathname;

    fixtureSession.startVTCapture();
    await fixtureSession.spawn("bun", [fixture]);
    await fixtureSession.wait(300);
    fixtureSession.mouseMove(5, 3);
    await fixtureSession.wait(100);
    fixtureSession.click(5, 3, MouseButton.Left);
    await fixtureSession.wait(700);

    const chunks = fixtureSession.stopVTCapture();
    for (const chunk of chunks) {
      replaySession.getTerminal().write(chunk);
    }

    expect(replaySession.getScreen().raw).toContain("Count: 1");

    fixtureSession.cleanup();
    replaySession.cleanup();
  });

  test("replaying captured app output as one concatenated chunk preserves in-place redraws", async () => {
    const fixtureSession = createSession({ cols: 70, rows: 16, cwd: process.cwd() });
    const replaySession = createSession({ cols: 70, rows: 16, cwd: process.cwd() });
    const fixture = new URL(
      "../../solid-bindings/test/fixtures/click-counter-manual.ts",
      import.meta.url,
    ).pathname;

    fixtureSession.startVTCapture();
    await fixtureSession.spawn("bun", [fixture]);
    await fixtureSession.wait(300);
    fixtureSession.mouseMove(5, 3);
    await fixtureSession.wait(100);
    fixtureSession.click(5, 3, MouseButton.Left);
    await fixtureSession.wait(700);

    const chunks = fixtureSession.stopVTCapture();
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    replaySession.getTerminal().write(combined);

    expect(replaySession.getScreen().raw).toContain("Count: 1");

    fixtureSession.cleanup();
    replaySession.cleanup();
  });
});
