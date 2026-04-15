const STATEFUL_COMPONENT = Symbol.for("@tui/solid-bindings/stateful-component");
const STATEFUL_COMPONENT_TARGET = Symbol.for("@tui/solid-bindings/stateful-component-target");

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

/**
 * Preferred ergonomic helper for export-time stateful components.
 *
 * This returns a transparent wrapper so callers can write:
 *
 *   export const Foo = stateful(function Foo(props) { ... });
 *
 * The reconciler unwraps the original target internally, so the wrapper does
 * not add an extra component boundary at invocation time.
 */
export function stateful<T extends Function>(component: T): T {
  if (isStatefulComponent(component)) {
    return component;
  }

  const wrapped = function StatefulComponentWrapper(this: unknown, ...args: unknown[]) {
    return Reflect.apply(component, this, args);
  } as unknown as T;

  for (const key of Reflect.ownKeys(component)) {
    if (
      key === "length" ||
      key === "name" ||
      key === "prototype" ||
      key === STATEFUL_COMPONENT ||
      key === STATEFUL_COMPONENT_TARGET
    ) {
      continue;
    }
    const descriptor = Object.getOwnPropertyDescriptor(component, key);
    if (descriptor) {
      Object.defineProperty(wrapped, key, descriptor);
    }
  }

  if (component.name) {
    try {
      Object.defineProperty(wrapped, "name", {
        configurable: true,
        value: component.name,
      });
    } catch {
      // Ignore runtimes that do not permit redefining function names.
    }
  }

  Object.defineProperty(wrapped, STATEFUL_COMPONENT_TARGET, {
    configurable: false,
    enumerable: false,
    value: component,
    writable: false,
  });

  return markStatefulComponent(wrapped);
}

/** Internal guard used by the reconciler when deciding how to invoke a component. */
export function isStatefulComponent(value: unknown): boolean {
  return Boolean(
    value &&
    typeof value === "function" &&
    (value as Record<PropertyKey, unknown>)[STATEFUL_COMPONENT],
  );
}

/** Internal hook that lets the reconciler unwrap transparent stateful helpers. */
export function getStatefulComponentTarget<T extends Function>(component: T): T {
  if (typeof component !== "function") {
    return component;
  }
  return ((component as Record<PropertyKey, unknown>)[STATEFUL_COMPONENT_TARGET] as T) ?? component;
}
