import { createInput, createTerm, type InputEvent, type Op } from "clayterm";
import { Renderable } from "./Renderable.js";
import {
  MouseEvent,
  KeyboardEvent,
  PasteEvent,
  type MouseModifiers,
  type KeyboardModifiers,
} from "./events.js";

export interface RendererOptions {
  width?: number;
  height?: number;
}

export class Renderer {
  private term: Awaited<ReturnType<typeof createTerm>> | null = null;
  private input: Awaited<ReturnType<typeof createInput>> | null = null;

  readonly width: number;
  readonly height: number;

  focusedRenderable: Renderable | null = null;
  rootRenderable: Renderable | null = null;
  lastPointerEvents: any[] = [];
  hoveredRenderables: Renderable[] = [];
  pressedRenderable: Renderable | null = null;

  private renderablesById: Map<string, Renderable> = new Map();

  constructor(options: RendererOptions = {}) {
    this.width = options.width ?? process.stdout.columns ?? 80;
    this.height = options.height ?? process.stdout.rows ?? 24;
  }

  async init(): Promise<void> {
    this.term = await createTerm({ width: this.width, height: this.height });
    this.input = await createInput();
  }

  setRoot(renderable: Renderable): void {
    const previousFocusedRenderable = this.focusedRenderable;
    const previouslyFocusedId = this.focusedRenderable?.id ?? null;
    const previouslyPressedId = this.pressedRenderable?.id ?? null;
    const previouslyHoveredIds = this.hoveredRenderables.map((hovered) => hovered.id);

    this.renderablesById.clear();

    this.rootRenderable = renderable;
    this.buildIdMap(renderable);

    this.hoveredRenderables = previouslyHoveredIds
      .map((id) => this.findRenderable(id))
      .filter((hovered): hovered is Renderable => Boolean(hovered));

    this.pressedRenderable = previouslyPressedId
      ? (this.findRenderable(previouslyPressedId) ?? null)
      : null;

    if (!previouslyFocusedId) return;

    const nextFocusedRenderable = this.findRenderable(previouslyFocusedId);
    if (!nextFocusedRenderable) {
      this.focusedRenderable = null;
      return;
    }

    this.focusedRenderable = nextFocusedRenderable;
    if (nextFocusedRenderable.focusable) {
      nextFocusedRenderable.focused = true;
    }

    if (previousFocusedRenderable && nextFocusedRenderable.id === previousFocusedRenderable.id) {
      nextFocusedRenderable.hydrate(previousFocusedRenderable);
    }
  }

  private buildIdMap(renderable: Renderable): void {
    this.renderablesById.set(renderable.id, renderable);
    for (const child of renderable.children) {
      this.buildIdMap(child);
    }
  }

  findRenderable(id: string): Renderable | undefined {
    return this.renderablesById.get(id);
  }

  focusRenderable(renderable: Renderable): void {
    if (!renderable.focusable) return;
    if (this.focusedRenderable === renderable) return;

    if (this.focusedRenderable) {
      this.focusedRenderable.blur();
    }

    this.focusedRenderable = renderable;
    renderable.focus();
  }

  getFocusableRenderables(): Renderable[] {
    if (!this.rootRenderable) {
      return [];
    }

    const focusables: Renderable[] = [];
    this.collectFocusableRenderables(this.rootRenderable, focusables);
    return focusables;
  }

  focusNext(backward: boolean = false): Renderable | null {
    const focusables = this.getFocusableRenderables();
    if (focusables.length === 0) {
      return null;
    }

    if (!this.focusedRenderable) {
      const next = backward ? focusables[focusables.length - 1]! : focusables[0]!;
      this.focusRenderable(next);
      return next;
    }

    const currentIndex = focusables.findIndex(
      (renderable) => renderable.id === this.focusedRenderable?.id,
    );

    if (currentIndex === -1) {
      const next = backward ? focusables[focusables.length - 1]! : focusables[0]!;
      this.focusRenderable(next);
      return next;
    }

    const delta = backward ? -1 : 1;
    const nextIndex = (currentIndex + delta + focusables.length) % focusables.length;
    const next = focusables[nextIndex]!;
    this.focusRenderable(next);
    return next;
  }

  beginPointerPress(): void {
    this.pressedRenderable = this.getHoveredRenderable();
  }

  getHoveredRenderable(): Renderable | null {
    return this.hoveredRenderables[this.hoveredRenderables.length - 1] ?? null;
  }

  blurRenderable(renderable: Renderable): void {
    if (this.focusedRenderable !== renderable) return;

    renderable.blur();
    this.focusedRenderable = null;
  }

  render(ops: Op[], pointer?: { x: number; y: number; down: boolean }): Uint8Array {
    if (!this.term) {
      throw new Error("Renderer not initialized. Call init() first.");
    }

    const { output, events } = this.term.render(ops, { pointer });
    this.lastPointerEvents = events;

    // Process events from clayterm
    for (const event of events) {
      this.handlePointerEvent(event);
    }

    if (pointer && !pointer.down) {
      this.pressedRenderable = null;
    }

    return output;
  }

  private handlePointerEvent(event: any): void {
    if (!event.id) return;

    const renderable = this.findRenderable(event.id);
    if (!renderable) return;

    // Create MouseEvent
    const mouseEvent = new MouseEvent(
      event.type === "pointerclick"
        ? "click"
        : event.type === "pointerdown"
          ? "mousedown"
          : event.type === "pointerup"
            ? "mouseup"
            : event.type === "pointermove"
              ? "mousemove"
              : event.type,
      renderable,
      {
        x: event.x ?? 0,
        y: event.y ?? 0,
        button: event.button ?? 0,
        modifiers: {
          shift: event.shift ?? false,
          alt: event.alt ?? false,
          ctrl: event.ctrl ?? false,
        },
      },
    );

    // Dispatch event (bubbles through tree)
    renderable.processEvent(mouseEvent);

    if (event.type === "pointerenter") {
      this.hoveredRenderables = [
        ...this.hoveredRenderables.filter((hovered) => hovered.id !== renderable.id),
        renderable,
      ];
    }

    if (event.type === "pointerleave") {
      this.hoveredRenderables = this.hoveredRenderables.filter(
        (hovered) => hovered.id !== renderable.id,
      );
    }

    // Auto-focus on left click, unless prevented
    if (event.type === "pointerclick" && !mouseEvent.defaultPrevented) {
      const focusable =
        renderable.getFocusableAncestor() ?? renderable.getFirstFocusableDescendant();
      if (focusable) {
        this.focusRenderable(focusable);
      } else if (this.focusedRenderable) {
        const pressedFocusable = this.pressedRenderable?.getFocusableAncestor() ?? null;
        if (pressedFocusable?.id !== this.focusedRenderable.id) {
          this.blurRenderable(this.focusedRenderable);
        }
      }
    }
  }

  handleInput(bytes: Uint8Array): InputEvent[] {
    if (!this.input) {
      throw new Error("Renderer not initialized. Call init() first.");
    }

    const { events } = this.input.scan(bytes);

    for (const event of events) {
      this.processInputEvent(event);
    }

    return events;
  }

  private collectFocusableRenderables(renderable: Renderable, focusables: Renderable[]): void {
    if (renderable.focusable) {
      focusables.push(renderable);
    }

    for (const child of renderable.children) {
      this.collectFocusableRenderables(child, focusables);
    }
  }

  private processInputEvent(event: InputEvent): void {
    if (event.type === "keydown" || event.type === "keyrepeat") {
      const keyEvent = new KeyboardEvent("keydown", this.focusedRenderable, {
        key: event.key ?? "",
        code: event.code,
        modifiers: {
          shift: event.shift ?? false,
          alt: event.alt ?? false,
          ctrl: event.ctrl ?? false,
          meta: false,
        },
        repeated: event.type === "keyrepeat",
      });

      const isTabNavigationKey =
        (keyEvent.key === "Tab" || keyEvent.code === "Tab") &&
        !keyEvent.modifiers.ctrl &&
        !keyEvent.modifiers.alt &&
        !keyEvent.modifiers.meta;

      // Dispatch to focused element
      if (this.focusedRenderable) {
        this.focusedRenderable.processEvent(keyEvent);
      }

      if (isTabNavigationKey && !keyEvent.defaultPrevented) {
        this.focusNext(keyEvent.modifiers.shift);
      }
    } else if (event.type === "keyup") {
      const keyEvent = new KeyboardEvent("keyup", this.focusedRenderable, {
        key: event.key ?? "",
        code: event.code,
        modifiers: {
          shift: event.shift ?? false,
          alt: event.alt ?? false,
          ctrl: event.ctrl ?? false,
          meta: false,
        },
      });

      if (this.focusedRenderable) {
        this.focusedRenderable.processEvent(keyEvent);
      }
    } else if (typeof (event as { text?: unknown }).text === "string") {
      const pasteEvent = new PasteEvent(
        this.focusedRenderable,
        (event as unknown as { text: string }).text,
      );

      if (this.focusedRenderable) {
        this.focusedRenderable.processEvent(pasteEvent);
      }
    }
  }

  destroy(): void {
    if (this.rootRenderable) {
      this.rootRenderable.destroy();
    }
    this.renderablesById.clear();
    this.hoveredRenderables = [];
    this.pressedRenderable = null;
    this.focusedRenderable = null;
    this.rootRenderable = null;
    this.term = null;
    this.input = null;
  }
}
