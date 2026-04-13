import type {
  BufferModel,
  BufferWindowModel,
  ResolvedBufferWindowSurface,
  WindowId,
} from "./types";

export function createBufferMap(buffers: readonly BufferModel[]): ReadonlyMap<string, BufferModel> {
  return new Map(buffers.map((buffer) => [buffer.id, buffer]));
}

export function resolveBufferWindowSurfaces(
  buffers: readonly BufferModel[],
  windows: readonly BufferWindowModel[],
): ResolvedBufferWindowSurface[] {
  const bufferMap = createBufferMap(buffers);

  return windows.map((window, order) => {
    const floating = window.mode === "floating";
    return {
      order,
      window,
      buffer: bufferMap.get(window.bufferId),
      floating,
      zIndex: floating ? (window.floating?.zIndex ?? 0) : 0,
    } satisfies ResolvedBufferWindowSurface;
  });
}

export function resolveActiveWindowId(
  windows: readonly BufferWindowModel[],
  current?: WindowId,
  preferred?: WindowId,
): WindowId | undefined {
  const candidates = windows.filter((window) => window.focusable !== false);
  const search = candidates.length > 0 ? candidates : windows;

  if (current && search.some((window) => window.id === current)) {
    return current;
  }

  if (preferred && search.some((window) => window.id === preferred)) {
    return preferred;
  }

  return search[0]?.id;
}

export function partitionBufferWindowSurfaces(surfaces: readonly ResolvedBufferWindowSurface[]): {
  docked: ResolvedBufferWindowSurface[];
  floating: ResolvedBufferWindowSurface[];
} {
  const docked = surfaces.filter((surface) => !surface.floating);
  const floating = surfaces
    .filter((surface) => surface.floating)
    .slice()
    .sort((left, right) => {
      if (left.zIndex !== right.zIndex) {
        return left.zIndex - right.zIndex;
      }
      return left.order - right.order;
    });

  return { docked, floating };
}
