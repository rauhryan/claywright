const STATEFUL_COMPONENT = Symbol.for("@tui/solid-bindings/stateful-component");

/**
 * Marks a component as owning persistent local runtime state that must survive
 * parent rerenders and post-render geometry observation.
 *
 * This is intentionally narrow. Boundary/control-flow components MUST keep the
 * normal Solid component path; only stateful terminal primitives should use it.
 */
export function markStatefulComponent<T extends Function>(component: T): T {
  Object.defineProperty(component, STATEFUL_COMPONENT, {
    configurable: false,
    enumerable: false,
    value: true,
    writable: false,
  });
  return component;
}

/** Internal guard used by the reconciler when deciding how to invoke a component. */
export function isStatefulComponent(value: unknown): boolean {
  return Boolean(
    value &&
    typeof value === "function" &&
    (value as Record<PropertyKey, unknown>)[STATEFUL_COMPONENT],
  );
}
