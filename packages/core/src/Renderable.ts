import type { TerminalEvent, MouseEvent, KeyboardEvent, PasteEvent } from "./events.js";
import {
  MouseEvent as MouseEventClass,
  KeyboardEvent as KeyboardEventClass,
  PasteEvent as PasteEventClass,
} from "./events.js";

export enum RenderableEvents {
  FOCUSED = "focused",
  BLURRED = "blurred",
}

export interface RenderableOptions {
  id?: string;
  focusable?: boolean;
}

export abstract class Renderable {
  readonly id: string;
  parent: Renderable | null = null;
  children: Renderable[] = [];

  focusable: boolean = false;
  focused: boolean = false;

  // Event handlers
  onClick?: (event: MouseEvent) => void;
  onMouseDown?: (event: MouseEvent) => void;
  onMouseUp?: (event: MouseEvent) => void;
  onMouseMove?: (event: MouseEvent) => void;
  onKeyDown?: (event: KeyboardEvent) => void;
  onKeyUp?: (event: KeyboardEvent) => void;
  onPaste?: (event: PasteEvent) => void;
  onFocus?: () => void;
  onBlur?: () => void;

  protected _isDestroyed: boolean = false;

  private static idCounter = 0;

  constructor(options: RenderableOptions = {}) {
    this.id = options.id ?? `renderable_${Renderable.idCounter++}`;
    this.focusable = options.focusable ?? false;
  }

  // Tree operations
  add(child: Renderable, index?: number): void {
    if (child.parent) {
      child.parent.remove(child);
    }
    child.parent = this;
    if (index !== undefined) {
      this.children.splice(index, 0, child);
    } else {
      this.children.push(child);
    }
  }

  remove(child: Renderable): void {
    const index = this.children.indexOf(child);
    if (index >= 0) {
      this.children.splice(index, 1);
      child.parent = null;
    }
  }

  // Focus
  focus(): void {
    if (this._isDestroyed || this.focused || !this.focusable) return;
    this.focused = true;
    this.onFocus?.();
  }

  blur(): void {
    if (!this.focused || !this.focusable) return;
    this.focused = false;
    this.onBlur?.();
  }

  // Event processing
  protected beforeProcessEvent(_event: TerminalEvent): void {}

  protected afterProcessEvent(_event: TerminalEvent): void {}

  hydrate(_previous: Renderable): void {}

  processEvent(event: TerminalEvent): void {
    this.beforeProcessEvent(event);

    // Call appropriate handler
    if (event instanceof MouseEventClass) {
      switch (event.type) {
        case "click":
          this.onClick?.(event);
          break;
        case "mousedown":
          this.onMouseDown?.(event);
          break;
        case "mouseup":
          this.onMouseUp?.(event);
          break;
        case "mousemove":
          this.onMouseMove?.(event);
          break;
      }
    } else if (event instanceof KeyboardEventClass) {
      switch (event.type) {
        case "keydown":
          this.onKeyDown?.(event);
          break;
        case "keyup":
          this.onKeyUp?.(event);
          break;
      }
    } else if (event instanceof PasteEventClass) {
      this.onPaste?.(event);
    }

    // Bubble to parent unless stopped
    if (this.parent && !event.propagationStopped) {
      this.parent.processEvent(event);
    }

    this.afterProcessEvent(event);
  }

  // Lifecycle
  destroy(): void {
    if (this._isDestroyed) return;
    this._isDestroyed = true;

    // Destroy children
    for (const child of this.children) {
      child.destroy();
    }
    this.children = [];

    // Remove from parent
    if (this.parent) {
      this.parent.remove(this);
    }

    // Blur if focused
    if (this.focused) {
      this.blur();
    }
  }

  get isDestroyed(): boolean {
    return this._isDestroyed;
  }

  // Tree traversal
  getRenderableById(id: string): Renderable | undefined {
    if (this.id === id) return this;
    for (const child of this.children) {
      const found = child.getRenderableById(id);
      if (found) return found;
    }
    return undefined;
  }

  getFocusableAncestor(): Renderable | undefined {
    let current: Renderable | null = this;
    while (current) {
      if (current.focusable) return current;
      current = current.parent;
    }
    return undefined;
  }

  getFirstFocusableDescendant(): Renderable | undefined {
    for (const child of this.children) {
      if (child.focusable) {
        return child;
      }

      const nested = child.getFirstFocusableDescendant();
      if (nested) {
        return nested;
      }
    }

    return undefined;
  }
}
