import { describe, test, expect } from "bun:test";
import { createSignal, flush, createRenderEffect, createRoot } from "solid-js";

describe("Solid 2.0 batched signals", () => {
  test("createSignal: setter requires flush() to commit (Solid 2.0 batching)", () => {
    const [get, set] = createSignal(0);
    expect(get()).toBe(0);
    set(1);
    expect(get()).toBe(0);
    flush();
    expect(get()).toBe(1);
  });

  test("createSignal: flush() commits all pending updates", () => {
    const [get, set] = createSignal(0);
    set(1);
    set((n) => n + 1);
    expect(get()).toBe(0);
    flush();
    expect(get()).toBe(2);
  });

  test("createRenderEffect: re-evaluates after flush() following signal change", () => {
    const [get, set] = createSignal(0);
    const observed: number[] = [];

    createRoot((dispose) => {
      createRenderEffect(
        () => get(),
        (v) => {
          observed.push(v);
        },
      );
    });

    expect(observed).toEqual([0]);

    set(1);
    expect(observed).toEqual([0]);

    flush();
    expect(observed).toEqual([0, 1]);

    set((n) => n + 10);
    flush();
    expect(observed).toEqual([0, 1, 11]);
  });

  test("createRenderEffect: flush() from inside setInterval callback", async () => {
    const [get, set] = createSignal(0);
    const observed: number[] = [];

    createRoot((dispose) => {
      createRenderEffect(
        () => get(),
        (v) => {
          observed.push(v);
        },
      );
    });

    expect(observed).toEqual([0]);

    await new Promise<void>((resolve) => {
      let count = 0;
      const id = setInterval(() => {
        count++;
        set((n) => n + 1);
        flush();
        if (count >= 3) {
          clearInterval(id);
          resolve();
        }
      }, 30);
    });

    expect(observed).toEqual([0, 1, 2, 3]);
  });

  test("requestAnimationFrame pattern: setFrame then frame+flush", async () => {
    const [get, set] = createSignal(0);
    let renderCount = 0;

    createRoot((dispose) => {
      createRenderEffect(
        () => ({ value: get() }),
        (props) => {
          renderCount++;
        },
      );
    });

    expect(renderCount).toBe(1);

    await new Promise<void>((resolve) => {
      let count = 0;
      const id = setInterval(() => {
        count++;
        set((n) => n + 1);
        flush();
        if (count >= 3) {
          clearInterval(id);
          resolve();
        }
      }, 30);
    });

    expect(renderCount).toBe(4);
    expect(get()).toBe(3);
  });
});
