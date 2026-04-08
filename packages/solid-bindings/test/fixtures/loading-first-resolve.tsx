/** @jsxImportSource @tui/solid-bindings */
import { fixed, grow, lazy, Loading, rgba, runApp } from "@tui/solid-bindings";

const AsyncResolved = lazy(async () => {
  await new Promise((resolve) => setTimeout(resolve, 80));
  return {
    default: () => <text color={rgba(255, 255, 255)}>Resolved content</text>,
  };
});

runApp(() => (
  <box width={grow()} height={grow()} direction="ttb" bg={rgba(10, 14, 22)}>
    <box height={fixed(2)} padding={{ left: 2, top: 1 }}>
      <text color={rgba(120, 190, 255)}>Sibling stable</text>
    </box>

    <box height={fixed(3)} padding={{ left: 2, top: 1 }}>
      <Loading fallback={<text color={rgba(255, 210, 90)}>Loading fallback</text>}>
        <AsyncResolved />
      </Loading>
    </box>
  </box>
));
