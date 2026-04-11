const STATEFUL_COMPONENT = Symbol.for("@tui/solid-bindings/stateful-component");

export function markStatefulComponent<T extends Function>(component: T): T {
  Object.defineProperty(component, STATEFUL_COMPONENT, {
    configurable: false,
    enumerable: false,
    value: true,
    writable: false,
  });
  return component;
}

export function isStatefulComponent(value: unknown): boolean {
  return Boolean(
    value &&
    typeof value === "function" &&
    (value as Record<PropertyKey, unknown>)[STATEFUL_COMPONENT],
  );
}
