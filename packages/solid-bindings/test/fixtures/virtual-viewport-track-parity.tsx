/** @jsxImportSource @tui/solid-bindings */
import {
  computeViewportTrackGeometry,
  createPreparedTextVirtualItem,
  createSignal,
  fixed,
  grow,
  markStatefulComponent,
  runApp,
  VirtualViewport,
  VirtualViewportTrack,
} from "@tui/solid-bindings";

const VIEWPORT_ROWS = 10;
const ITEM_COUNT = 40;
const PAGE_STEP = VIEWPORT_ROWS - 1;
const WHEEL_STEP = 3;

function makeItems(prefix: string) {
  return Array.from({ length: ITEM_COUNT }, (_, index) =>
    createPreparedTextVirtualItem({
      key: `${prefix}-${index + 1}`,
      text: `${prefix} Row ${index + 1}`,
      estimatedElementsPerRow: 1,
      estimatedMeasuredWords: 1,
    })
  );
}

function applyScroll(current: number, delta: number): number {
  return Math.max(0, Math.min(current + delta, ITEM_COUNT - VIEWPORT_ROWS));
}

function LeftColumn() {
  const [focus, setFocus] = createSignal(false);
  const [clicked, setClicked] = createSignal(false);
  const [wheel, setWheel] = createSignal("-");
  const [scroll, setScroll] = createSignal(0);
  const items = makeItems("Left");

  const summary = () => `L f=${focus() ? "y" : "n"} c=${clicked() ? "y" : "n"} w=${wheel()} s=${scroll()}`;

  return (
    <box width={grow()} height={grow()} direction="ttb" bg={0xff101827}>
      <box width={grow()} height={fixed(1)} bg={0xff20345c}>
        <text color={0xffedf5ff}>Left viewport · no track</text>
      </box>
      <box width={grow()} height={fixed(1)} bg={0xff15213b}>
        <text color={0xffcfe0ff}>{summary()}</text>
      </box>
      <VirtualViewport
        id="left-viewport"
        height={fixed(VIEWPORT_ROWS)}
        initialAutoFollow={false}
        bg={0xff101010}
        items={items}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        onClick={() => setClicked(true)}
        onWheel={(event) => {
          setWheel(event.direction === "down" ? "d" : "u");
          queueMicrotask(() => {
            setScroll((current) => applyScroll(current, event.direction === "down" ? WHEEL_STEP : -WHEEL_STEP));
          });
        }}
        onKeyDown={(event) => {
          const code = event.code ?? event.key;
          queueMicrotask(() => {
            if (code === "PageDown") setScroll((current) => applyScroll(current, PAGE_STEP));
            if (code === "PageUp") setScroll((current) => applyScroll(current, -PAGE_STEP));
            if (code === "Home") setScroll(0);
            if (code === "End") setScroll(ITEM_COUNT);
          });
        }}
      />
    </box>
  ) as never;
}

function RightColumn() {
  const [focus, setFocus] = createSignal(false);
  const [clicked, setClicked] = createSignal(false);
  const [wheel, setWheel] = createSignal("-");
  const [scroll, setScroll] = createSignal(0);
  const items = makeItems("Right");

  const summary = () => {
    const track = computeViewportTrackGeometry({
      scrollTop: scroll(),
      contentHeight: ITEM_COUNT,
      viewportHeight: VIEWPORT_ROWS,
    }, VIEWPORT_ROWS);
    return `R f=${focus() ? "y" : "n"} c=${clicked() ? "y" : "n"} w=${wheel()} s=${scroll()} t=${track.thumbPos}/${track.thumbSize}`;
  };

  return (
    <box width={grow()} height={grow()} direction="ttb" bg={0xff16122a}>
      <box width={grow()} height={fixed(1)} bg={0xff3c275d}>
        <text color={0xfff8efff}>Right viewport · with track</text>
      </box>
      <box width={grow()} height={fixed(1)} bg={0xff221a39}>
        <text color={0xffeadbff}>{summary()}</text>
      </box>
      <box width={grow()} height={fixed(VIEWPORT_ROWS)} direction="ltr">
        <VirtualViewport
          id="right-viewport"
          width={grow()}
          height={fixed(VIEWPORT_ROWS)}
          initialAutoFollow={false}
          bg={0xff101010}
          items={items}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          onClick={() => setClicked(true)}
          onWheel={(event) => {
            setWheel(event.direction === "down" ? "d" : "u");
            queueMicrotask(() => {
              setScroll((current) => applyScroll(current, event.direction === "down" ? WHEEL_STEP : -WHEEL_STEP));
            });
          }}
          onKeyDown={(event) => {
            const code = event.code ?? event.key;
            queueMicrotask(() => {
              if (code === "PageDown") setScroll((current) => applyScroll(current, PAGE_STEP));
              if (code === "PageUp") setScroll((current) => applyScroll(current, -PAGE_STEP));
              if (code === "Home") setScroll(0);
              if (code === "End") setScroll(ITEM_COUNT);
            });
          }}
        />
        <VirtualViewportTrack
          id="right-track"
          state={{
            scrollTop: scroll(),
            contentHeight: ITEM_COUNT,
            viewportHeight: VIEWPORT_ROWS,
          }}
          rows={VIEWPORT_ROWS}
          bg={0xff282832}
          activeColor={0xfff0b429}
          inactiveColor={0xffdce7ff}
        />
      </box>
    </box>
  ) as never;
}

markStatefulComponent(LeftColumn);
markStatefulComponent(RightColumn);

runApp(() => (
  <box width={grow()} height={grow()} direction="ltr" bg={0xff0b1020}>
    <LeftColumn />
    <RightColumn />
  </box>
));
