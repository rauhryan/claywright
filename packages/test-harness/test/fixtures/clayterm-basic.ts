import { createInput, createTerm, close, fixed, grow, open, rgba, text } from "clayterm";

let term = await createTerm({ width: 40, height: 10 });
let input = await createInput();

let pointer = { x: -1, y: -1, down: false };
let hovered = false;
let clicked = false;

function render() {
  let label = clicked ? "Clicked" : hovered ? "Hovered" : "Idle";
  let bg = hovered ? rgba(255, 255, 255) : undefined;
  let color = hovered ? rgba(0, 0, 0) : rgba(255, 255, 255);

  let { output, events } = term.render(
    [
      open("root", {
        layout: { width: grow(), height: grow(), direction: "ttb" },
      }),
      open("button", {
        layout: { width: fixed(12), height: fixed(3), padding: { left: 1, top: 1 } },
        border: {
          color: rgba(255, 255, 255),
          left: 1,
          right: 1,
          top: 1,
          bottom: 1,
        },
        bg,
      }),
      text(label, { color }),
      close(),
      close(),
    ],
    { pointer },
  );

  for (let event of events) {
    if (event.type === "pointerenter" && event.id === "button") {
      hovered = true;
    }
    if (event.type === "pointerleave" && event.id === "button") {
      hovered = false;
    }
    if (event.type === "pointerclick" && event.id === "button") {
      clicked = true;
    }
  }

  process.stdout.write(output);

  if (events.length > 0) {
    let next = term.render(
      [
        open("root", {
          layout: { width: grow(), height: grow(), direction: "ttb" },
        }),
        open("button", {
          layout: { width: fixed(12), height: fixed(3), padding: { left: 1, top: 1 } },
          border: {
            color: rgba(255, 255, 255),
            left: 1,
            right: 1,
            top: 1,
            bottom: 1,
          },
          bg: hovered ? rgba(255, 255, 255) : undefined,
        }),
        text(clicked ? "Clicked" : hovered ? "Hovered" : "Idle", {
          color: hovered ? rgba(0, 0, 0) : rgba(255, 255, 255),
        }),
        close(),
        close(),
      ],
      { pointer },
    );

    process.stdout.write(next.output);
  }
}

render();

process.stdin.on("data", (buf) => {
  let { events } = input.scan(new Uint8Array(buf));

  for (let event of events) {
    if (event.type === "mousemove") {
      pointer = { x: event.x, y: event.y, down: pointer.down };
    }
    if (event.type === "mousedown") {
      pointer = { x: event.x, y: event.y, down: true };
    }
    if (event.type === "mouseup") {
      pointer = { x: event.x, y: event.y, down: false };
    }
  }

  render();
});

process.stdin.resume();

setTimeout(() => {
  process.exit(0);
}, 5000);
