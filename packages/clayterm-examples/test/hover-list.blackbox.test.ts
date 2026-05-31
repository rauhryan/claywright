import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createSession, type TerminalSession } from "../../test-harness/src/index";

const fixture = new URL("./fixtures/hover-list.ts", import.meta.url).pathname;

async function click(session: TerminalSession, col: number, row: number): Promise<void> {
  session.mouseDown(col, row);
  await session.wait(50);
  session.mouseUp(col, row);
}

describe("hover list fixture", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 50, rows: 16, cwd: process.cwd() });
  });

  afterEach(() => {
    session.cleanup();
  });

  test("Given separated one-row boxes, When the pointer moves by row, Then hover follows the visual row exactly", async () => {
    await session.spawn("bun", [fixture]);
    expect(await session.waitForText("HoverTarget: none", 2000)).toBe(true);

    const alpha = session.findText("Alpha");
    const bravo = session.findText("Bravo");
    expect(alpha).not.toBeNull();
    expect(bravo).not.toBeNull();

    const alphaNormal = session.getCellStyle(alpha!.col, alpha!.row);
    const bravoNormal = session.getCellStyle(bravo!.col, bravo!.row);

    session.mouseMove(alpha!.col, alpha!.row - 1);
    await session.wait(120);
    expect(session.containsText("HoverTarget: none")).toBe(true);
    expect(session.getCellStyle(alpha!.col, alpha!.row)).toEqual(alphaNormal);

    session.mouseMove(alpha!.col, alpha!.row);
    expect(await session.waitForText("HoverTarget: alpha", 2000)).toBe(true);
    const alphaHover = session.getCellStyle(alpha!.col, alpha!.row);
    expect(alphaHover).not.toEqual(alphaNormal);
    expect(session.getCellStyle(bravo!.col, bravo!.row)).toEqual(bravoNormal);

    session.mouseMove(alpha!.col, alpha!.row + 1);
    expect(await session.waitForText("HoverTarget: none", 2000)).toBe(true);
    expect(session.getCellStyle(alpha!.col, alpha!.row)).toEqual(alphaNormal);

    session.mouseMove(bravo!.col, bravo!.row);
    expect(await session.waitForText("HoverTarget: bravo", 2000)).toBe(true);
    expect(session.getCellStyle(bravo!.col, bravo!.row)).not.toEqual(bravoNormal);
    expect(session.getCellStyle(alpha!.col, alpha!.row)).toEqual(alphaNormal);
  });

  test("Given separated one-row boxes, When clicking item rows and gap rows, Then only item rows activate", async () => {
    await session.spawn("bun", [fixture]);
    expect(await session.waitForText("ClickTarget: none", 2000)).toBe(true);

    const bravo = session.findText("Bravo");
    const charlie = session.findText("Charlie");
    expect(bravo).not.toBeNull();
    expect(charlie).not.toBeNull();

    await click(session, bravo!.col, bravo!.row + 1);
    await session.wait(120);
    expect(session.containsText("ClickTarget: none")).toBe(true);

    await click(session, bravo!.col, bravo!.row);
    expect(await session.waitForText("ClickTarget: bravo", 2000)).toBe(true);

    await click(session, charlie!.col, charlie!.row);
    expect(await session.waitForText("ClickTarget: charlie", 2000)).toBe(true);
  });
});
