import type { ElementBounds } from "clayterm";

export interface ElementBoundsObserverOptions {
  elementId: string;
  readCurrent: () => ElementBounds | undefined;
  readNext: (id: string) => ElementBounds | undefined;
  writeNext: (bounds: ElementBounds | undefined) => void;
  warningThreshold?: number;
}

/**
 * Coalesces async geometry reads and warns when an element keeps reporting the
 * same next bounds without the caller ever converging to that value.
 *
 * This guardrail exists because stateful components that observe layout after
 * paint can otherwise get stuck in a silent microtask loop that looks like
 * unrelated input/routing breakage.
 */
export function createElementBoundsObserver(options: ElementBoundsObserverOptions) {
  const warningThreshold = options.warningThreshold ?? 32;

  let pending = false;
  let warned = false;
  let staleRepeatCount = 0;
  let lastNextKey: string | undefined;

  return {
    request(): void {
      if (pending) return;
      pending = true;

      queueMicrotask(() => {
        pending = false;

        const current = options.readCurrent();
        const next = options.readNext(options.elementId);

        if (sameBounds(current, next)) {
          staleRepeatCount = 0;
          lastNextKey = serializeBounds(next);
          return;
        }

        const nextKey = serializeBounds(next);
        if (nextKey === lastNextKey) {
          staleRepeatCount += 1;
        } else {
          staleRepeatCount = 1;
          lastNextKey = nextKey;
        }

        if (!warned && staleRepeatCount >= warningThreshold) {
          warned = true;
          console.warn(
            `[solid-bindings] Element bounds for '${options.elementId}' repeated ${staleRepeatCount} times without converging. ` +
              `Check for stateful component re-instantiation or a bounds observation loop.`,
          );
        }

        options.writeNext(next);
      });
    },
  };
}

export function sameBounds(a: ElementBounds | undefined, b: ElementBounds | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

function serializeBounds(bounds: ElementBounds | undefined): string {
  if (!bounds) return "undefined";
  return `${bounds.x},${bounds.y},${bounds.width},${bounds.height}`;
}
