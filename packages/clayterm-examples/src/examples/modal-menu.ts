import { ATTACH_POINT, ATTACH_TO, close, fixed, grow, open, rgba, text, type Op } from "clayterm";
import { getTerminalSize, runExample, type ExampleDefinition } from "../runtime";

interface CommandItem {
  id: string;
  label: string;
  shortcut: string;
  detail: string;
}

interface State {
  size: { width: number; height: number };
  menuOpen: boolean;
  hoveredLauncher: boolean;
  pressedLauncher: boolean;
  selectedIndex: number;
  query: string;
  lastAction: string;
}

const commands: CommandItem[] = [
  { id: "project", label: "Open Project", shortcut: "Cmd+O", detail: "Switch workspaces" },
  { id: "files", label: "Search Files", shortcut: "Cmd+P", detail: "Jump to a file" },
  { id: "symbol", label: "Go to Symbol", shortcut: "Cmd+T", detail: "Find code faster" },
  { id: "theme", label: "Change Theme", shortcut: "Shift+T", detail: "Swap visual modes" },
  { id: "tests", label: "Run Test Suite", shortcut: "Cmd+R", detail: "Verify the project" },
];

const palette = {
  appBg: rgba(8, 12, 18),
  panelBg: rgba(15, 22, 31),
  panelBorder: rgba(100, 141, 174),
  panelText: rgba(237, 242, 247),
  mutedText: rgba(147, 169, 189),
  accentText: rgba(198, 227, 247),
  launcherBg: rgba(28, 44, 61),
  launcherHover: rgba(46, 73, 100),
  launcherPressed: rgba(75, 116, 156),
  shadowBg: rgba(3, 5, 8, 220),
  modalBg: rgba(14, 20, 28),
  modalBorder: rgba(163, 205, 226),
  searchBg: rgba(24, 33, 46),
  selectedBg: rgba(69, 103, 138),
  selectedText: rgba(248, 251, 252),
  railBg: rgba(12, 18, 26),
  railBorder: rgba(77, 107, 133),
};

const size = getTerminalSize();

function truncate(value: string, width: number) {
  if (width <= 0) return "";
  if (value.length <= width) return value;
  if (width <= 1) return value.slice(0, width);
  return `${value.slice(0, width - 1)}…`;
}

function padRight(value: string, width: number) {
  return truncate(value, width).padEnd(width, " ");
}

function centerText(value: string, width: number) {
  const trimmed = truncate(value, width);
  const left = Math.max(0, Math.floor((width - trimmed.length) / 2));
  return `${" ".repeat(left)}${trimmed}`.padEnd(width, " ");
}

function commandLine(label: string, shortcut: string, width: number) {
  if (width <= 0) return "";
  const minGap = width > shortcut.length ? 1 : 0;
  const labelWidth = Math.max(0, width - shortcut.length - minGap);
  const left = truncate(label, labelWidth).padEnd(labelWidth, " ");
  return `${left}${minGap ? " " : ""}${shortcut}`.slice(0, width).padEnd(width, " ");
}

function pushLine(ops: Op[], id: string, content: string, color: number, bg?: number) {
  ops.push(open(id, { layout: { width: grow(), height: fixed(1) }, bg }));
  ops.push(text(content, { color }));
  ops.push(close());
}

function pushSpacer(ops: Op[]) {
  ops.push(open("", { layout: { width: grow(), height: fixed(1) } }));
  ops.push(close());
}

function visibleCommandIndices(query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return commands.map((_, index) => index);
  return commands.flatMap((command, index) => {
    const haystack = `${command.label} ${command.detail} ${command.shortcut}`.toLowerCase();
    return haystack.includes(needle) ? [index] : [];
  });
}

function normalizeSelection(query: string, selectedIndex: number) {
  const visible = visibleCommandIndices(query);
  if (visible.length === 0) return -1;
  return visible.includes(selectedIndex) ? selectedIndex : visible[0];
}

function moveSelection(query: string, selectedIndex: number, delta: number) {
  const visible = visibleCommandIndices(query);
  if (visible.length === 0) return -1;
  const current = visible.indexOf(normalizeSelection(query, selectedIndex));
  const next = (current + delta + visible.length) % visible.length;
  return visible[next];
}

function openMenu(state: State): State {
  return {
    ...state,
    menuOpen: true,
    pressedLauncher: false,
    query: "",
    selectedIndex: normalizeSelection("", state.selectedIndex),
  };
}

function closeMenu(state: State): State {
  return {
    ...state,
    menuOpen: false,
    pressedLauncher: false,
  };
}

function activateSelection(state: State, index: number): State {
  if (index < 0 || index >= commands.length) return state;
  return {
    ...state,
    menuOpen: false,
    pressedLauncher: false,
    query: "",
    selectedIndex: index,
    lastAction: `Ran ${commands[index].label}`,
  };
}

function modalMetrics(screen: { width: number; height: number }) {
  const width = Math.max(34, Math.min(38, screen.width - 16));
  const height = Math.max(11, Math.min(12, screen.height - 6));
  return {
    width: Math.min(width, screen.width - 2),
    height: Math.min(height, screen.height - 2),
    innerWidth: Math.max(0, Math.min(width, screen.width - 2) - 4),
  };
}

function modalRect(screen: { width: number; height: number }) {
  const modal = modalMetrics(screen);
  return {
    x: Math.floor((screen.width - modal.width) / 2),
    y: Math.floor((screen.height - modal.height) / 2),
    width: modal.width,
    height: modal.height,
  };
}

function pointInRect(
  x: number,
  y: number,
  rect: { x: number; y: number; width: number; height: number },
) {
  return x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height;
}

const example: ExampleDefinition<State, Op> = {
  width: size.width,
  height: size.height,
  initialState: {
    size,
    menuOpen: false,
    hoveredLauncher: false,
    pressedLauncher: false,
    selectedIndex: 0,
    query: "",
    lastAction: "Waiting for a command",
  },
  view(state) {
    const ops: Op[] = [];
    const railWidth = Math.max(12, Math.min(15, Math.floor(state.size.width / 5)));
    const centerWidth = Math.max(26, Math.min(32, state.size.width - railWidth * 2 - 10));
    const launcherWidth = 18;
    const launcherLabel = state.menuOpen ? "Palette Open" : "Open Menu";
    const launcherBg = state.pressedLauncher
      ? palette.launcherPressed
      : state.hoveredLauncher
        ? palette.launcherHover
        : palette.launcherBg;
    const visible = visibleCommandIndices(state.query);
    const selected = normalizeSelection(state.query, state.selectedIndex);
    const modal = modalMetrics(state.size);
    const queryLine =
      state.query.length > 0
        ? `> ${truncate(state.query, Math.max(0, modal.innerWidth - 2))}`
        : `> ${truncate("Type to filter actions", Math.max(0, modal.innerWidth - 2))}`;

    ops.push(
      open("root", {
        layout: { width: grow(), height: grow(), direction: "ttb" },
        bg: palette.appBg,
      }),
    );
    ops.push(open("", { layout: { width: grow(), height: fixed(2) } }));
    ops.push(close());
    pushLine(
      ops,
      "titlebar",
      centerText("Atlas Workspace", state.size.width),
      palette.mutedText,
      palette.appBg,
    );
    ops.push(
      open("main-row", {
        layout: { width: grow(), height: grow(), direction: "ltr" },
        bg: palette.appBg,
      }),
    );
    ops.push(open("", { layout: { width: grow(), height: grow() } }));
    ops.push(close());
    ops.push(
      open("explorer", {
        layout: {
          width: fixed(railWidth),
          height: fixed(12),
          direction: "ttb",
          padding: { left: 1, right: 1, top: 1, bottom: 1 },
        },
        bg: palette.railBg,
        border: { color: palette.railBorder, left: 1, right: 1, top: 1, bottom: 1 },
        cornerRadius: { tl: 1, tr: 1, bl: 1, br: 1 },
      }),
    );
    pushLine(
      ops,
      "explorer-title",
      padRight("Explorer", railWidth - 2),
      palette.accentText,
      palette.railBg,
    );
    pushSpacer(ops);
    pushLine(ops, "explorer-1", padRight("src/", railWidth - 2), palette.panelText, palette.railBg);
    pushLine(ops, "explorer-2", padRight("ui/", railWidth - 2), palette.mutedText, palette.railBg);
    pushLine(
      ops,
      "explorer-3",
      padRight("commands/", railWidth - 2),
      palette.mutedText,
      palette.railBg,
    );
    pushLine(
      ops,
      "explorer-4",
      padRight("tests/", railWidth - 2),
      palette.mutedText,
      palette.railBg,
    );
    pushSpacer(ops);
    pushLine(
      ops,
      "explorer-5",
      padRight("git: clean", railWidth - 2),
      palette.mutedText,
      palette.railBg,
    );
    pushLine(
      ops,
      "explorer-6",
      padRight("branch: demo", railWidth - 2),
      palette.mutedText,
      palette.railBg,
    );
    ops.push(close());

    ops.push(open("", { layout: { width: fixed(2), height: grow() } }));
    ops.push(close());

    ops.push(
      open("workspace", {
        layout: {
          width: fixed(centerWidth),
          height: fixed(12),
          direction: "ttb",
          padding: { left: 2, right: 2, top: 1, bottom: 1 },
        },
        bg: palette.panelBg,
        border: { color: palette.panelBorder, left: 1, right: 1, top: 1, bottom: 1 },
        cornerRadius: { tl: 1, tr: 1, bl: 1, br: 1 },
      }),
    );
    pushLine(ops, "workspace-title", "Canvas", palette.accentText, palette.panelBg);
    pushSpacer(ops);
    pushLine(
      ops,
      "workspace-copy",
      padRight("Underlying panes stay visible around the modal.", centerWidth - 4),
      palette.panelText,
      palette.panelBg,
    );
    pushLine(
      ops,
      "workspace-copy-2",
      padRight("The palette floats above this canvas at a higher z-index.", centerWidth - 4),
      palette.mutedText,
      palette.panelBg,
    );
    pushSpacer(ops);
    pushLine(
      ops,
      "workspace-status",
      padRight(`Last action: ${state.lastAction}`, centerWidth - 4),
      palette.panelText,
      palette.panelBg,
    );
    pushLine(
      ops,
      "workspace-hint",
      padRight("Open with /, Ctrl+K, or the launcher button.", centerWidth - 4),
      palette.mutedText,
      palette.panelBg,
    );
    pushSpacer(ops);
    ops.push(
      open("launcher", {
        layout: { width: fixed(launcherWidth), height: fixed(1) },
        bg: launcherBg,
      }),
    );
    ops.push(text(centerText(launcherLabel, launcherWidth), { color: palette.selectedText }));
    ops.push(close());
    pushLine(
      ops,
      "workspace-shortcuts",
      padRight("Shortcut: / or Ctrl+K", centerWidth - 4),
      palette.mutedText,
      palette.panelBg,
    );
    ops.push(close());

    ops.push(open("", { layout: { width: fixed(2), height: grow() } }));
    ops.push(close());

    ops.push(
      open("inspector", {
        layout: {
          width: fixed(railWidth),
          height: fixed(12),
          direction: "ttb",
          padding: { left: 1, right: 1, top: 1, bottom: 1 },
        },
        bg: palette.railBg,
        border: { color: palette.railBorder, left: 1, right: 1, top: 1, bottom: 1 },
        cornerRadius: { tl: 1, tr: 1, bl: 1, br: 1 },
      }),
    );
    pushLine(
      ops,
      "inspector-title",
      padRight("Inspector", railWidth - 2),
      palette.accentText,
      palette.railBg,
    );
    pushSpacer(ops);
    pushLine(
      ops,
      "inspector-1",
      padRight("focus: ui", railWidth - 2),
      palette.panelText,
      palette.railBg,
    );
    pushLine(
      ops,
      "inspector-2",
      padRight("modal: root", railWidth - 2),
      palette.mutedText,
      palette.railBg,
    );
    pushLine(
      ops,
      "inspector-3",
      padRight("layer: z30", railWidth - 2),
      palette.mutedText,
      palette.railBg,
    );
    pushLine(
      ops,
      "inspector-4",
      padRight("click: close", railWidth - 2),
      palette.mutedText,
      palette.railBg,
    );
    pushSpacer(ops);
    pushLine(
      ops,
      "inspector-5",
      padRight("hint: type", railWidth - 2),
      palette.mutedText,
      palette.railBg,
    );
    pushLine(
      ops,
      "inspector-6",
      padRight("state: ready", railWidth - 2),
      palette.mutedText,
      palette.railBg,
    );
    ops.push(close());
    ops.push(open("", { layout: { width: grow(), height: grow() } }));
    ops.push(close());
    ops.push(close());

    if (state.menuOpen) {
      ops.push(
        open("palette-shadow", {
          layout: {
            width: fixed(modal.width),
            height: fixed(modal.height),
          },
          floating: {
            x: 1,
            y: 1,
            attachTo: ATTACH_TO.ROOT,
            attachPoints: {
              element: ATTACH_POINT.CENTER_CENTER,
              parent: ATTACH_POINT.CENTER_CENTER,
            },
            zIndex: 20,
          },
          bg: palette.shadowBg,
          cornerRadius: { tl: 1, tr: 1, bl: 1, br: 1 },
        }),
      );
      ops.push(close());

      ops.push(
        open("palette", {
          layout: {
            width: fixed(modal.width),
            height: fixed(modal.height),
            direction: "ttb",
            padding: { left: 2, right: 2, top: 1, bottom: 1 },
          },
          floating: {
            attachTo: ATTACH_TO.ROOT,
            attachPoints: {
              element: ATTACH_POINT.CENTER_CENTER,
              parent: ATTACH_POINT.CENTER_CENTER,
            },
            zIndex: 30,
          },
          bg: palette.modalBg,
          border: { color: palette.modalBorder, left: 1, right: 1, top: 1, bottom: 1 },
          cornerRadius: { tl: 1, tr: 1, bl: 1, br: 1 },
        }),
      );
      pushLine(
        ops,
        "palette-title",
        padRight("Command Palette", modal.innerWidth),
        palette.accentText,
        palette.modalBg,
      );
      pushSpacer(ops);
      pushLine(
        ops,
        "palette-query",
        padRight(queryLine, modal.innerWidth),
        state.query.length > 0 ? palette.panelText : palette.mutedText,
        palette.searchBg,
      );
      pushSpacer(ops);

      if (visible.length === 0) {
        pushLine(
          ops,
          "palette-empty",
          padRight("No matching actions", modal.innerWidth),
          palette.mutedText,
          palette.modalBg,
        );
        pushSpacer(ops);
        pushSpacer(ops);
        pushSpacer(ops);
        pushSpacer(ops);
      } else {
        for (const index of visible) {
          const command = commands[index];
          const selectedRow = index === selected;
          pushLine(
            ops,
            `item-${index}`,
            commandLine(command.label, command.shortcut, modal.innerWidth),
            selectedRow ? palette.selectedText : palette.panelText,
            selectedRow ? palette.selectedBg : palette.modalBg,
          );
        }
        for (let fill = visible.length; fill < 5; fill++) {
          pushLine(
            ops,
            `palette-fill-${fill}`,
            " ".repeat(modal.innerWidth),
            palette.panelText,
            palette.modalBg,
          );
        }
      }

      pushSpacer(ops);
      pushLine(
        ops,
        "palette-footer",
        padRight("Enter run   Esc close   Click outside to dismiss", modal.innerWidth),
        palette.mutedText,
        palette.modalBg,
      );
      ops.push(close());
    }

    ops.push(close());
    return ops;
  },
  reduce(state, inputEvents, pointerEvents) {
    let next = { ...state };

    for (const event of inputEvents) {
      if (
        event.type === "mousedown" &&
        event.button === "left" &&
        next.hoveredLauncher &&
        !next.menuOpen
      ) {
        next.pressedLauncher = true;
      }

      if (event.type === "mouseup") {
        next.pressedLauncher = false;
        if (next.menuOpen && (event.button === "left" || event.button === "release")) {
          if (!pointInRect(event.x, event.y, modalRect(next.size))) {
            next = closeMenu(next);
          }
        }
      }

      if (event.type !== "keydown" && event.type !== "keyrepeat") continue;

      if (event.ctrl && event.key.toLowerCase() === "k") {
        next = next.menuOpen ? closeMenu(next) : openMenu(next);
        continue;
      }

      if (!next.menuOpen && event.key === "/") {
        next = openMenu(next);
        continue;
      }

      if (!next.menuOpen) continue;

      if (event.key === "Escape") {
        next = closeMenu(next);
        continue;
      }

      if (event.key === "ArrowDown") {
        next.selectedIndex = moveSelection(next.query, next.selectedIndex, 1);
        continue;
      }

      if (event.key === "ArrowUp") {
        next.selectedIndex = moveSelection(next.query, next.selectedIndex, -1);
        continue;
      }

      if (event.key === "Enter") {
        next = activateSelection(next, normalizeSelection(next.query, next.selectedIndex));
        continue;
      }

      if (event.key === "Backspace") {
        next.query = next.query.slice(0, -1);
        next.selectedIndex = normalizeSelection(next.query, next.selectedIndex);
        continue;
      }

      if (!event.ctrl && !event.alt && event.key.length === 1) {
        next.query += event.key;
        next.selectedIndex = normalizeSelection(next.query, next.selectedIndex);
      }
    }

    for (const event of pointerEvents) {
      if (event.id === "launcher") {
        if (event.type === "pointerenter") next.hoveredLauncher = true;
        if (event.type === "pointerleave") {
          next.hoveredLauncher = false;
          next.pressedLauncher = false;
        }
        if (event.type === "pointerclick") {
          next = openMenu(next);
        }
      }

      if (event.id.startsWith("item-")) {
        const index = Number(event.id.slice(5));
        if (Number.isNaN(index)) continue;
        if (event.type === "pointerenter") {
          next.selectedIndex = index;
        }
        if (event.type === "pointerclick") {
          next = activateSelection(next, index);
        }
      }
    }

    return next;
  },
  summary(state) {
    const visible = visibleCommandIndices(state.query).length;
    return state.menuOpen
      ? `Palette open | ${visible} results | Enter run | Esc close`
      : `Palette closed | / or Ctrl+K to open | ${state.lastAction}`;
  },
};

await runExample(example);
