import { close, fixed, grow, open, rgba, text, type Op } from "clayterm";
import { runExample, type ExampleDefinition } from "../../src/runtime";

interface State {
  hovered: string | null;
  clicked: string | null;
}

const items = [
  { id: "alpha", label: "Alpha" },
  { id: "bravo", label: "Bravo" },
  { id: "charlie", label: "Charlie" },
] as const;

const list = {
  x: 0,
  y: 5,
  width: 28,
};

function itemAtPoint(x: number, y: number): string | null {
  if (x < list.x || x >= list.x + list.width) return null;
  const relative = y - list.y;
  if (relative < 0 || relative % 2 !== 0) return null;
  return items[relative / 2]?.id ?? null;
}

const palette = {
  appBg: rgba(5, 8, 12),
  text: rgba(232, 238, 245),
  muted: rgba(150, 164, 178),
  normalBg: rgba(24, 34, 45),
  hoverBg: rgba(74, 113, 150),
  gapBg: rgba(5, 8, 12),
};

function line(ops: Op[], id: string, value: string, color = palette.text, bg = palette.appBg) {
  ops.push(open(id, { layout: { width: grow(), height: fixed(1) }, bg }));
  ops.push(text(value, { color }));
  ops.push(close());
}

const fixture: ExampleDefinition<State> = {
  width: 50,
  height: 16,
  initialState: { hovered: null, clicked: null },
  view(state) {
    const ops: Op[] = [];
    ops.push(
      open("root", {
        layout: { width: grow(), height: grow(), direction: "ttb" },
        bg: palette.appBg,
      }),
    );
    line(ops, "title", "Hover List Probe", palette.text);
    line(ops, "hover-state", `HoverTarget: ${state.hovered ?? "none"}`, palette.text);
    line(ops, "click-state", `ClickTarget: ${state.clicked ?? "none"}`, palette.text);
    line(ops, "hint", "Only the row under the pointer should highlight.", palette.muted);
    line(ops, "top-gap", "", palette.muted, palette.gapBg);

    ops.push(open("list", { layout: { width: fixed(28), direction: "ttb" }, bg: palette.appBg }));
    for (const item of items) {
      const hovered = state.hovered === item.id;
      ops.push(
        open(`item-${item.id}`, {
          layout: { width: fixed(28), height: fixed(1) },
          bg: hovered ? palette.hoverBg : palette.normalBg,
        }),
      );
      ops.push(text(` ${item.label.padEnd(24, " ")}`, { color: palette.text }));
      ops.push(close());
      line(ops, `gap-${item.id}`, "", palette.muted, palette.gapBg);
    }
    ops.push(close(), close());
    return ops;
  },
  reduce(state, inputEvents) {
    let next = { ...state };
    for (const event of inputEvents) {
      if (event.type !== "mousemove" && event.type !== "mousedown" && event.type !== "mouseup") {
        continue;
      }

      const id = itemAtPoint(event.x, event.y);
      next.hovered = id;
      if (event.type === "mouseup" && id) {
        next.clicked = id;
      }
    }
    return next;
  },
  summary(state) {
    return `hover-list | hover=${state.hovered ?? "none"} | click=${state.clicked ?? "none"}`;
  },
};

await runExample(fixture);
