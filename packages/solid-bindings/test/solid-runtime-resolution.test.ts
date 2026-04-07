import { expect, test } from "bun:test";

test("bun preload remaps solid-js server runtime to live runtime", async () => {
  const { createRoot, createRenderEffect, createSignal, flush } = await import("solid-js");

  const seen: number[] = [];

  createRoot((dispose) => {
    const [value, setValue] = createSignal(1);

    createRenderEffect(
      () => value(),
      (current) => {
        seen.push(current);
      },
    );

    flush();
    setValue(2);
    flush();
    dispose();
  });

  expect(seen).toEqual([1, 2]);
});
