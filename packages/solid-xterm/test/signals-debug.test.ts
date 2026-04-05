import { createSignal, createRoot, createRenderEffect, flush } from "solid-js/dist/solid.js";
import { describe, expect, it } from "bun:test";

describe("signals debug", () => {
  it("basic signal update", () => {
    const [count, setCount] = createSignal(0);
    expect(count()).toBe(0);
    setCount(5);
    flush();
    expect(count()).toBe(5);
  });

  it("effect with transparent option", () => {
    const [count, setCount] = createSignal(0);
    let runs = 0;
    let lastValue = 0;

    createRoot(() => {
      createRenderEffect(
        (prev) => count(),
        (value, prev) => {
          runs++;
          lastValue = value;
        },
        undefined,
        { transparent: true } as any
      );
    });
    flush();

    expect(runs).toBe(1);
    expect(lastValue).toBe(0);

    setCount(7);
    flush();
    expect(runs).toBe(2);
    expect(lastValue).toBe(7);
  });
});
