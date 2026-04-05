import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { createSession, type TerminalSession } from "../../test-harness/src/index";

const track = new URL("../src/examples/carousel-track.ts", import.meta.url).pathname;
const floating = new URL("../src/examples/carousel-floating.ts", import.meta.url).pathname;
const transition = new URL("../src/examples/carousel-transition.ts", import.meta.url).pathname;

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

      const before = session.captureStyles([{ col: 22, row: 12 }]);
      session.mouseMove(22, 12);
      await session.wait(120);
      expect(session.getStyleChanges(before).length).toBeGreaterThan(0);

      session.mouseDown(22, 12);
      await session.wait(50);
      session.mouseUp(22, 12);

      expect(await session.waitForText(transitionLabel, 2000)).toBe(true);
      expect(await session.waitForText("TIDE / 02", 2000)).toBe(true);
      expect(session.containsText("2/4")).toBe(true);
    });

    it("navigates back with left control", async () => {
      await session.spawn("bun", [fixture]);
      expect(await session.waitForText("DUNES / 01", 2000)).toBe(true);

      session.mouseDown(22, 12);
      await session.wait(50);
      session.mouseUp(22, 12);
      expect(await session.waitForText("TIDE / 02", 2000)).toBe(true);

      session.mouseMove(4, 12);
      await session.wait(120);
      session.mouseDown(4, 12);
      await session.wait(50);
      session.mouseUp(4, 12);

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
