import {
  createInput,
  createTerm,
  close,
  fixed,
  grow,
  open,
  rgba,
  text,
} from "clayterm";

let term = await createTerm({ width: 40, height: 8 });
let input = await createInput();

let pointer = { x: -1, y: -1, down: false };
let selecting = false;
let anchor = -1;
let focus = -1;

const value = "Hello world";

function paintText() {
  const ops = [] as ReturnType<typeof text | typeof open | typeof close>[];
  ops.push(open("root", {
    layout: { width: grow(), height: grow(), direction: "ttb" },
  }));
  ops.push(open("line", {
    layout: { width: fixed(20), height: fixed(1) },
  }));

  for (let i = 0; i < value.length; i++) {
    const selected = anchor !== -1 && focus !== -1 && i >= Math.min(anchor, focus) && i <= Math.max(anchor, focus);
    ops.push(open(`char-${i}`, {
      layout: { width: fixed(1), height: fixed(1) },
      bg: selected ? rgba(255, 255, 255) : undefined,
    }));
    ops.push(text(value[i], { color: selected ? rgba(0, 0, 0) : rgba(255, 255, 255) }));
    ops.push(close());
  }

  ops.push(close());
  ops.push(close());
  return ops;
}

function selectedText() {
  if (anchor === -1 || focus === -1) return "";
  const start = Math.min(anchor, focus);
  const end = Math.max(anchor, focus);
  return value.slice(start, end + 1);
}

function render() {
  const { output, events } = term.render(paintText(), { pointer });

  for (const event of events) {
    if (!event.id.startsWith("char-")) continue;
    const index = Number(event.id.slice(5));
    if (Number.isNaN(index)) continue;

    if (event.type === "pointerenter" && selecting) {
      focus = index;
    }
    if (event.type === "pointerclick") {
      anchor = index;
      focus = index;
      selecting = false;
    }
  }

  process.stdout.write(output);

  const summary = selectedText();
  if (summary) {
    process.stdout.write(`\x1b[3;1HSelected: ${summary}`);
  } else {
    process.stdout.write("\x1b[3;1HSelected: none");
  }
}

render();

process.stdin.on("data", (buf) => {
  const { events } = input.scan(new Uint8Array(buf));

  for (const event of events) {
    if (event.type === "mousemove") {
      pointer = { x: event.x, y: event.y, down: pointer.down };
    }
    if (event.type === "mousedown") {
      pointer = { x: event.x, y: event.y, down: true };
      selecting = true;
      anchor = event.x;
      focus = event.x;
    }
    if (event.type === "mouseup") {
      pointer = { x: event.x, y: event.y, down: false };
      selecting = false;
      focus = event.x;
    }
  }

  render();
});

process.stdin.resume();

setTimeout(() => {
  process.exit(0);
}, 5000);
