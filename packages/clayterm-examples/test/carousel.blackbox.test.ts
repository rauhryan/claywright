import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { createSession, type TerminalSession } from "../../test-harness/src/index";

const track = new URL("../src/examples/carousel-track.ts", import.meta.url).pathname;
const floating = new URL("../src/examples/carousel-floating.ts", import.meta.url).pathname;
const transition = new URL("../src/examples/carousel-transition.ts", import.meta.url).pathname;

function requireTextPosition(session: TerminalSession, value: string) {
  const match = session.findText(value);
  expect(match).not.toBeNull();
  return match!;
}

function buttonPoint(session: TerminalSession, label: string) {
  const match = requireTextPosition(session, label);
  return {
    col: match.col + Math.floor(label.length / 2),
    row: match.row,
  };
}

function carouselSuite(name: string, fixture: string, transitionLabel: string) {
  describe(name, () => {
    let session: TerminalSession;

    beforeEach(() => {
      session = createSession({ cols: 60, rows: 18, cwd: process.cwd() });
    });

    afterEach(() => {
      session.cleanup();
    });

    it("renders initial slide and controls", async () => {
      await session.spawn("bun", [fixture]);
      expect(await session.waitForText("DUNES / 01", 2000)).toBe(true);
      expect(session.containsText("Prev")).toBe(true);
      expect(session.containsText("Next")).toBe(true);
      expect(session.containsText("1/4")).toBe(true);
    });

    it("shows hover state on right control and navigates on click", async () => {
      await session.spawn("bun", [fixture]);
      expect(await session.waitForText("DUNES / 01", 2000)).toBe(true);

      const next = buttonPoint(session, "Next");

      const before = session.captureStyles([next]);
      session.mouseMove(next.col, next.row);
      await session.wait(120);
      expect(session.getStyleChanges(before).length).toBeGreaterThan(0);

      session.mouseDown(next.col, next.row);
      await session.wait(50);
      session.mouseUp(next.col, next.row);

      expect(await session.waitForText(transitionLabel, 2000)).toBe(true);
      expect(await session.waitForText("TIDE / 02", 2000)).toBe(true);
      expect(session.containsText("2/4")).toBe(true);
    });

    it("navigates back with left control", async () => {
      await session.spawn("bun", [fixture]);
      expect(await session.waitForText("DUNES / 01", 2000)).toBe(true);

      const next = buttonPoint(session, "Next");

      session.mouseDown(next.col, next.row);
      await session.wait(50);
      session.mouseUp(next.col, next.row);
      expect(await session.waitForText("TIDE / 02", 2000)).toBe(true);
      await session.wait(350);

      const prev = buttonPoint(session, "Prev");

      session.mouseMove(prev.col, prev.row);
      await session.wait(120);
      session.mouseDown(prev.col, prev.row);
      await session.wait(50);
      session.mouseUp(prev.col, prev.row);

      expect(await session.waitForText(transitionLabel, 2000)).toBe(true);
      expect(await session.waitForText("DUNES / 01", 2000)).toBe(true);
      expect(session.containsText("1/4")).toBe(true);
    });

    it("navigates with keyboard arrows", async () => {
      await session.spawn("bun", [fixture]);
      expect(await session.waitForText("DUNES / 01", 2000)).toBe(true);

      session.sendKey("right");
      expect(await session.waitForText("TIDE / 02", 2000)).toBe(true);

      session.sendKey("left");
      expect(await session.waitForText("DUNES / 01", 2000)).toBe(true);
    });
  });
}

carouselSuite("carousel-track", track, "track sliding");
carouselSuite("carousel-floating", floating, "floating frame");
carouselSuite("carousel-transition", transition, "native transition");
