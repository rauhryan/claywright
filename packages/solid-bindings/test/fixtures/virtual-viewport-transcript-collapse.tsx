/** @jsxImportSource @tui/solid-bindings */
import {
  computeViewportTrackGeometry,
  createMemo,
  createSignal,
  createTranscriptVirtualItem,
  fixed,
  grow,
  stateful,
  onCleanup,
  runApp,
  VirtualViewport,
  VirtualViewportTrack,
} from "@tui/solid-bindings";

const PAGE_BG = 0xff0b1020;
const TITLE_BG = 0xff1b2744;
const TITLE_FG = 0xfff5f8ff;
const STATUS_EXPANDED_BG = 0xff17344a;
const STATUS_EXPANDED_FG = 0xffb7ffd2;
const STATUS_COLLAPSED_BG = 0xff35213f;
const STATUS_COLLAPSED_FG = 0xffffd479;
const CONTROL_BORDER = 0xff5f79b8;
const CONTROL_BG = 0xff18233d;
const CONTROL_FG = 0xffdce7ff;
const TOGGLE_BG_EXPANDED = 0xff54306c;
const TOGGLE_BG_COLLAPSED = 0xfff0b429;
const TOGGLE_FG_EXPANDED = 0xffedd4ff;
const TOGGLE_FG_COLLAPSED = 0xff1e1329;
const FRAME_BG = 0xff0f1629;
const FRAME_BORDER_EXPANDED = 0xff76b7ff;
const FRAME_BORDER_COLLAPSED = 0xffc792ea;
const USER_BG = 0xff10261d;
const USER_HEADER_BG = 0xff1b3c2d;
const USER_SPEAKER = 0xffa6e3a1;
const USER_META = 0xff8db49c;
const USER_TEXT = 0xffeffff2;
const THINKING_BG_EXPANDED = 0xff1b1731;
const THINKING_BG_COLLAPSED = 0xff261637;
const THINKING_HEADER_EXPANDED = 0xff3c275d;
const THINKING_HEADER_COLLAPSED = 0xff54306c;
const THINKING_SPEAKER = 0xffedd4ff;
const THINKING_META = 0xffcbb6df;
const THINKING_TEXT = 0xfff8efff;
const THINKING_BADGE_BG = 0xfff0b429;
const THINKING_BADGE_FG = 0xff1e1329;
const ANSWER_BG = 0xff101f34;
const ANSWER_HEADER_BG = 0xff1c3657;
const ANSWER_SPEAKER = 0xff9ecbff;
const ANSWER_META = 0xff97b4d4;
const ANSWER_TEXT = 0xffedf5ff;
const SYSTEM_BG = 0xff2b2413;
const SYSTEM_HEADER_BG = 0xff4a3a16;
const SYSTEM_SPEAKER = 0xffffd479;
const SYSTEM_META = 0xffd2bb79;
const SYSTEM_TEXT = 0xfffff1cf;
const TRACK_ROWS = 6;

function LegendPill(props: { bg: number; color: number; label: string }) {
  return (
    <box bg={props.bg} height={fixed(1)} padding={{ left: 1, right: 1 }}>
      <text color={props.color}>{props.label}</text>
    </box>
  ) as never;
}

const TranscriptCollapseScreen = stateful(function TranscriptCollapseScreen() {
  const [collapsed, setCollapsed] = createSignal(false);
  const [revision, setRevision] = createSignal(1);
  const [status, setStatus] = createSignal("booting");
  const [lastToggle, setLastToggle] = createSignal("none");
  const [viewportState, setViewportState] = createSignal({
    scrollTop: 0,
    contentHeight: 0,
    viewportHeight: TRACK_ROWS,
    atStart: true,
    atEnd: false,
    autoFollow: false,
    budgetExceeded: false,
    windowStartIndex: 0,
    windowEndIndex: 0,
  });

  let pendingBackgroundUpdate: ReturnType<typeof setTimeout> | undefined;

  function scheduleCollapsedBackgroundUpdate(): void {
    if (pendingBackgroundUpdate) {
      clearTimeout(pendingBackgroundUpdate);
    }
    pendingBackgroundUpdate = setTimeout(() => {
      pendingBackgroundUpdate = undefined;
      setRevision((value) => value + 1);
    }, 900);
  }

  function toggleCollapsed(source: "click" | "key"): void {
    if (pendingBackgroundUpdate) {
      clearTimeout(pendingBackgroundUpdate);
      pendingBackgroundUpdate = undefined;
    }

    const next = !collapsed();
    setCollapsed(next);
    setLastToggle(source);
    setRevision((value) => value + 1);

    if (next) {
      scheduleCollapsedBackgroundUpdate();
    }
  }

  const items = createMemo(() => [
    createTranscriptVirtualItem({
      key: "user-1",
      speaker: "user",
      kind: "user",
      timestamp: "10:00",
      text: "Please show a transcript viewport that can collapse and expand a thinking block, keep updating while hidden, and still require real scrolling once the answer keeps going.",
      containerBg: USER_BG,
      headerBg: USER_HEADER_BG,
      bodyBg: USER_BG,
      speakerColor: USER_SPEAKER,
      metaColor: USER_META,
      bodyColor: USER_TEXT,
    }),
    createTranscriptVirtualItem({
      key: "thinking-1",
      speaker: "assistant",
      kind: "thinking",
      timestamp: "10:01",
      version: revision(),
      collapsed: collapsed(),
      collapsedSummary: `Thinking block collapsed at revision ${revision()}. Click the toggle panel or press c to expand. Hidden updates still continue in the background.`,
      badgeText: collapsed() ? "collapsed" : "live",
      badgeBg: THINKING_BADGE_BG,
      badgeColor: THINKING_BADGE_FG,
      text: [
        `Thinking block expanded revision ${revision()}.`,
        "Step 1: gather the user-visible requirements and keep the structure readable.",
        "Step 2: make the card visually distinct so collapse is obvious from a distance.",
        "Step 3: keep the body long enough that later answer cards fall below the fold and require scrolling.",
        "Step 4: while collapsed, continue advancing the revision so the hidden state is still alive.",
        "Step 5: when re-expanded, reveal the newer revision and keep the viewport geometry stable.",
        "Step 6: preserve enough extra explanation that this block now spans many wrapped rows in a narrow terminal.",
        "Step 7: leave room for a final answer and an appendix so the demo needs real scrolling even after the collapse interaction.",
      ].join("\n"),
      containerBg: collapsed() ? THINKING_BG_COLLAPSED : THINKING_BG_EXPANDED,
      headerBg: collapsed() ? THINKING_HEADER_COLLAPSED : THINKING_HEADER_EXPANDED,
      bodyBg: collapsed() ? THINKING_BG_COLLAPSED : THINKING_BG_EXPANDED,
      speakerColor: THINKING_SPEAKER,
      metaColor: THINKING_META,
      bodyColor: THINKING_TEXT,
    }),
    createTranscriptVirtualItem({
      key: "assistant-1",
      speaker: "assistant",
      kind: "assistant",
      timestamp: "10:02",
      text: "Final answer: the viewport frame should stay visible, the thinking card should collapse with one click, and later transcript cards should only appear after you scroll down through the longer body.",
      containerBg: ANSWER_BG,
      headerBg: ANSWER_HEADER_BG,
      bodyBg: ANSWER_BG,
      speakerColor: ANSWER_SPEAKER,
      metaColor: ANSWER_META,
      bodyColor: ANSWER_TEXT,
    }),
    createTranscriptVirtualItem({
      key: "system-1",
      speaker: "system",
      kind: "system",
      timestamp: "10:03",
      text: "Reviewer note: this fixture intentionally overflows the viewport so collapse changes, scroll state, and hidden background updates can all be inspected together.",
      containerBg: SYSTEM_BG,
      headerBg: SYSTEM_HEADER_BG,
      bodyBg: SYSTEM_BG,
      speakerColor: SYSTEM_SPEAKER,
      metaColor: SYSTEM_META,
      bodyColor: SYSTEM_TEXT,
    }),
    createTranscriptVirtualItem({
      key: "assistant-2",
      speaker: "assistant",
      kind: "assistant",
      timestamp: "10:04",
      text: "Appendix note: if you scroll further after re-expanding, this trailing card proves the transcript is now long enough to browse rather than fitting entirely inside the initial viewport window.",
      containerBg: ANSWER_BG,
      headerBg: ANSWER_HEADER_BG,
      bodyBg: ANSWER_BG,
      speakerColor: ANSWER_SPEAKER,
      metaColor: ANSWER_META,
      bodyColor: ANSWER_TEXT,
    }),
  ]);

  onCleanup(() => {
    if (pendingBackgroundUpdate) {
      clearTimeout(pendingBackgroundUpdate);
    }
  });

  return (
    <box width={grow()} height={grow()} direction="ttb" bg={PAGE_BG}>
      <box width={grow()} height={fixed(1)} bg={TITLE_BG}>
        <text color={TITLE_FG}>Virtual Viewport Transcript Collapse Demo</text>
      </box>
      <box
        width={grow()}
        height={fixed(1)}
        bg={collapsed() ? STATUS_COLLAPSED_BG : STATUS_EXPANDED_BG}
      >
        <text color={collapsed() ? STATUS_COLLAPSED_FG : STATUS_EXPANDED_FG}>{status()}</text>
      </box>
      <box
        id="toggle-button"
        width={fixed(24)}
        height={fixed(3)}
        focusable={true}
        bg={collapsed() ? TOGGLE_BG_COLLAPSED : TOGGLE_BG_EXPANDED}
        border={{ color: CONTROL_BORDER, left: 1, right: 1, top: 1, bottom: 1 }}
        padding={{ left: 1, top: 1 }}
        onClick={() => toggleCollapsed("click")}
        onKeyDown={(event) => {
          const code = (event.code ?? event.key).toLowerCase();
          if (code === "c" || code === "enter" || code === "space") {
            toggleCollapsed("key");
            event.preventDefault();
          }
        }}
      >
        <text color={collapsed() ? TOGGLE_FG_COLLAPSED : TOGGLE_FG_EXPANDED}>
          {collapsed() ? "Click to expand" : "Click to collapse"}
        </text>
      </box>
      <box
        id="transcript-frame"
        width={grow()}
        height={fixed(7)}
        bg={FRAME_BG}
        padding={{ left: 1, right: 1 }}
        border={{
          color: collapsed() ? FRAME_BORDER_COLLAPSED : FRAME_BORDER_EXPANDED,
          left: 1,
          right: 1,
          top: 1,
          bottom: 1,
        }}
      >
        <box width={grow()} height={fixed(TRACK_ROWS)} direction="ltr" gap={1}>
          <VirtualViewport
            id="viewport"
            width={grow()}
            height={fixed(TRACK_ROWS)}
            initialAutoFollow={false}
            bg={FRAME_BG}
            items={items()}
            onKeyDown={(event) => {
              const code = (event.code ?? event.key).toLowerCase();
              if (code === "c") {
                toggleCollapsed("key");
                event.preventDefault();
              }
            }}
            onStateChange={(state) => {
              setViewportState(state);
              const thumb = computeViewportTrackGeometry(state, TRACK_ROWS);
              setStatus(
                `collapsed=${collapsed() ? "yes" : "no"} revision=${revision()} via=${lastToggle()} scroll=${state.scrollTop} thumb=${thumb.thumbPos}/${thumb.thumbSize}`,
              );
            }}
          />
          <VirtualViewportTrack
            id="track"
            state={viewportState()}
            rows={TRACK_ROWS}
            bg={collapsed() ? THINKING_HEADER_COLLAPSED : ANSWER_HEADER_BG}
            activeColor={collapsed() ? THINKING_BADGE_BG : ANSWER_SPEAKER}
            inactiveColor={CONTROL_FG}
          />
        </box>
      </box>
      <box width={grow()} height={fixed(1)} bg={PAGE_BG} direction="ltr" gap={1}>
        <LegendPill bg={USER_HEADER_BG} color={USER_SPEAKER} label="user" />
        <LegendPill bg={THINKING_HEADER_COLLAPSED} color={THINKING_SPEAKER} label="thinking" />
        <LegendPill bg={ANSWER_HEADER_BG} color={ANSWER_SPEAKER} label="answer" />
        <LegendPill bg={SYSTEM_HEADER_BG} color={SYSTEM_SPEAKER} label="system" />
        <text color={CONTROL_FG}>
          Click toggles · keyboard c also works · longer content now requires scrolling.
        </text>
      </box>
    </box>
  ) as never;
});

runApp(() => <TranscriptCollapseScreen />);
