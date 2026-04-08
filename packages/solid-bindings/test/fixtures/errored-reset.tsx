/** @jsxImportSource @tui/solid-bindings */
import { createSignal } from "solid-js";
import { Errored, fixed, grow, rgba, runApp } from "@tui/solid-bindings";

function MaybeCrash({ shouldThrow }: { shouldThrow: () => boolean }) {
  if (shouldThrow()) {
    throw new Error("boom");
  }
  return <text color={rgba(255, 255, 255)}>Healthy content</text>;
}

runApp(() => {
  const [shouldThrow, setShouldThrow] = createSignal(false);
  const [attempt, setAttempt] = createSignal(0);

  return (
    <box width={grow()} height={grow()} direction="ttb" bg={rgba(10, 14, 22)}>
      <box height={fixed(2)} padding={{ left: 2, top: 1 }}>
        <text color={rgba(120, 190, 255)}>Sibling stable</text>
      </box>

      <box
        width={fixed(28)}
        height={fixed(4)}
        padding={{ left: 1, top: 1 }}
        border={{ color: rgba(255, 255, 255), left: 1, right: 1, top: 1, bottom: 1 }}
        bg={rgba(50, 70, 110)}
        focusable={true}
        onClick={() => {
          setAttempt((value) => value + 1);
          setShouldThrow(true);
        }}
        onKeyDown={(event) => {
          const keyboardEvent = event as { key?: string };
          if (keyboardEvent.key?.toLowerCase() === "r") {
            setShouldThrow(false);
          }
        }}
      >
        <Errored fallback={<text color={rgba(255, 120, 120)}>Errored fallback</text>}>
          <MaybeCrash shouldThrow={shouldThrow} />
        </Errored>
      </box>

      <box height={fixed(2)} padding={{ left: 2, top: 1 }}>
        <text color={rgba(200, 200, 200)}>Attempt: {attempt()}</text>
      </box>
    </box>
  );
});
