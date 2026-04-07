/** @jsxImportSource @tui/solid-bindings */
import { createSignal } from "solid-js";
import { fixed, grow, rgba, runApp } from "@tui/solid-bindings";

type Item = {
  id: string;
  label: string;
};

const [items, setItems] = createSignal<Item[]>([
  { id: "alpha", label: "Alpha" },
  { id: "beta", label: "Beta" },
  { id: "gamma", label: "Gamma" },
]);
const [focusedId, setFocusedId] = createSignal<string>("");
const [lastKeyTarget, setLastKeyTarget] = createSignal<string>("none");

runApp(() => (
  <box width={grow()} height={grow()} direction="ttb" bg={rgba(10, 14, 22)}>
    <box height={fixed(2)} padding={{ left: 2, top: 1 }}>
      <text color={rgba(120, 190, 255)}>
        Click Beta, press r to reorder, then x to verify focus
      </text>
    </box>

    {items().map((item) => (
      <box
        id={`item-${item.id}`}
        width={fixed(24)}
        height={fixed(3)}
        padding={{ left: 1, top: 1 }}
        bg={focusedId() === item.id ? rgba(100, 200, 100) : rgba(100, 149, 237)}
        border={{ color: rgba(255, 255, 255), left: 1, right: 1, top: 1, bottom: 1 }}
        focusable={true}
        onFocus={() => setFocusedId(item.id)}
        onBlur={() => {
          if (focusedId() === item.id) {
            setFocusedId("");
          }
        }}
        onKeyDown={(event) => {
          const keyboardEvent = event as { key?: string; code?: string };
          const key = keyboardEvent.key?.toLowerCase();
          if (key === "r" || keyboardEvent.code === "KeyR") {
            setItems((current) => current.toReversed());
          }
          if (key === "x" || keyboardEvent.code === "KeyX") {
            setLastKeyTarget(item.label);
          }
        }}
      >
        <text color={rgba(255, 255, 255)}>
          {item.label} {focusedId() === item.id ? "FOCUSED" : "idle"}
        </text>
      </box>
    ))}

    <box height={fixed(2)} padding={{ left: 2, top: 1 }}>
      <text color={rgba(200, 200, 200)}>Focused id: {focusedId() || "none"}</text>
    </box>

    <box height={fixed(2)} padding={{ left: 2, top: 1 }}>
      <text color={rgba(255, 210, 90)}>Last key target: {lastKeyTarget()}</text>
    </box>

    <box height={fixed(2)} padding={{ left: 2, top: 1 }}>
      <text color={rgba(180, 180, 180)}>
        Order:{" "}
        {items()
          .map((item) => item.label)
          .join(", ")}
      </text>
    </box>
  </box>
));
