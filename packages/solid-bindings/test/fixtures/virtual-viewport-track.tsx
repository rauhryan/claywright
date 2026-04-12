/** @jsxImportSource @tui/solid-bindings */
import {
  computeViewportTrackGeometry,
  createPreparedTextVirtualItem,
  createSignal,
  fixed,
  grow,
  markStatefulComponent,
  runApp,
  type VirtualViewportHandle,
  type VirtualViewportState,
  VirtualViewport,
  VirtualViewportTrack,
} from "@tui/solid-bindings";

const TRACK_ROWS = 8;
const ROW_COUNT = 80;
const WHEEL_STEP = 3;

const INITIAL_VIEWPORT_STATE: VirtualViewportState = {
  scrollTop: 0,
  contentHeight: ROW_COUNT,
  viewportHeight: TRACK_ROWS,
  atStart: true,
  atEnd: false,
  autoFollow: false,
  budgetExceeded: false,
  windowStartIndex: 0,
  windowEndIndex: TRACK_ROWS,
};

const items = Array.from({ length: ROW_COUNT }, (_, index) => createPreparedTextVirtualItem({
  key: `row-${index + 1}`,
  text: `Row ${index + 1}`,
  estimatedElementsPerRow: 1,
  estimatedMeasuredWords: 1,
}));

function sameViewportState(a: VirtualViewportState, b: VirtualViewportState): boolean {
  return a.scrollTop === b.scrollTop &&
    a.contentHeight === b.contentHeight &&
    a.viewportHeight === b.viewportHeight &&
    a.atStart === b.atStart &&
    a.atEnd === b.atEnd &&
    a.autoFollow === b.autoFollow &&
    a.budgetExceeded === b.budgetExceeded &&
    a.windowStartIndex === b.windowStartIndex &&
    a.windowEndIndex === b.windowEndIndex;
}

function TrackDemoScreen() {
  const [viewportState, setViewportState] = createSignal(INITIAL_VIEWPORT_STATE);
  const [lastEvent, setLastEvent] = createSignal("none");
  let handle: VirtualViewportHandle | undefined;

  function syncViewportState(next: VirtualViewportState): void {
    setViewportState((current) => sameViewportState(current, next) ? current : next);
  }

  function syncViewportStateFromHandle(): void {
    const next = handle?.getState();
    if (next) {
      syncViewportState(next);
    }
  }

  function scrollViewport(delta: number, label: string): void {
    if (!handle) {
      setLastEvent(`${label}:no-handle`);
      return;
    }

    handle.scrollBy(delta);
    queueMicrotask(() => {
      setLastEvent(label);
      syncViewportStateFromHandle();
    });
  }

  const summary = () => {
    const state = viewportState();
    const thumb = computeViewportTrackGeometry(state, TRACK_ROWS);
    return `scroll=${state.scrollTop} thumb=${thumb.thumbPos}/${thumb.thumbSize} evt=${lastEvent()}`;
  };

  return (
    <box width={grow()} height={grow()} direction="ttb">
      <box width={grow()} height={fixed(1)}>
        <text>Virtual Viewport Scroll Track Demo</text>
      </box>
      <box width={grow()} height={fixed(1)}>
        <text>{summary()}</text>
      </box>
      <box
        id="scroll-region"
        width={grow()}
        height={fixed(TRACK_ROWS)}
        direction="ltr"
        onWheel={(event) => {
          if (event.defaultPrevented) return;
          scrollViewport(event.direction === "up" ? -WHEEL_STEP : WHEEL_STEP, `${event.direction === "up" ? "u" : "d"}@${event.x},${event.y}`);
          event.preventDefault();
        }}
      >
        <VirtualViewport
          id="viewport"
          width={grow()}
          height={fixed(TRACK_ROWS)}
          initialAutoFollow={false}
          bg={0xff101010}
          items={items}
          onWheel={(event) => {
            setLastEvent(`${event.direction === "up" ? "u" : "d"}@${event.x},${event.y}`);
          }}
          onKeyDown={(event) => {
            setLastEvent(`key:${event.code ?? event.key}`);
          }}
          onStateChange={(state) => {
            syncViewportState(state);
          }}
          ref={(value) => {
            handle = value;
            if (value) {
              syncViewportState(value.getState());
            }
          }}
        />
        <VirtualViewportTrack
          id="track"
          state={viewportState()}
          rows={TRACK_ROWS}
          bg={0xff282832}
        />
      </box>
      <box width={grow()} height={fixed(1)}>
        <text>Wheel or PageDown to scroll. Track mirrors the viewport scroll state.</text>
      </box>
    </box>
  ) as never;
}

markStatefulComponent(TrackDemoScreen);

runApp(() => <TrackDemoScreen />);
