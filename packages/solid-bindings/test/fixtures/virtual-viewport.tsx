import { createSignal, fixed, grow, runApp, VirtualViewport } from "@tui/solid-bindings";

type ItemDef = {
  key: string;
  label: string;
};

const items: ItemDef[] = Array.from({ length: 60 }, (_, index) => ({
  key: `row-${index + 1}`,
  label: `Row ${index + 1}`,
}));

const [stateText, setStateText] = createSignal("booting");
const [focusText, setFocusText] = createSignal("focus=no");

runApp(() => (
  <box width={grow()} height={grow()} direction="ttb">
    <box width={grow()} height={fixed(1)}>
      <text>Virtual Viewport Demo</text>
    </box>
    <box width={grow()} height={fixed(1)}>
      <text>{stateText()}</text>
    </box>
    <box width={grow()} height={fixed(1)}>
      <text>{focusText()}</text>
    </box>
    <VirtualViewport
      id="viewport"
      height={fixed(6)}
      initialAutoFollow={false}
      enableArrowKeys
      bg={0xff101010}
      items={items.map((item) => ({
        key: item.key,
        version: 1,
        measure: () => ({ height: 1, estimatedElements: 1, estimatedMeasuredWords: 1 }),
        render: () => (
          <box width={grow()} height={fixed(1)}>
            <text>{item.label}</text>
          </box>
        ),
      }))}
      onStateChange={(state) => {
        setStateText(
          `scroll=${state.scrollTop} window=${state.windowStartIndex}-${state.windowEndIndex} ${state.autoFollow ? "yes" : "no"}`,
        );
      }}
      onFocus={() => setFocusText("focus=yes")}
      onBlur={() => setFocusText("focus=no")}
      onWheel={() => setFocusText("wheel=yes")}
      onClick={() => setFocusText("click=yes")}
    />
    <box width={grow()} height={fixed(1)}>
      <text>Use wheel or click+PageDown</text>
    </box>
  </box>
));
