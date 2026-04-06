import type { KeyboardEvent, PasteEvent, TerminalEvent } from "./events.js";
import { KeyboardEvent as KeyboardEventClass, PasteEvent as PasteEventClass } from "./events.js";
import { Renderable, type RenderableOptions } from "./Renderable.js";

export interface InputRenderableOptions extends RenderableOptions {
  value?: string;
  placeholder?: string;
  cursorOffset?: number;
  onInput?: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

export class InputRenderable extends Renderable {
  value: string;
  placeholder: string;
  cursorOffset: number;
  showCursor: boolean;

  private readonly controlledValue: boolean;
  private readonly controlledCursorOffset: boolean;
  private readonly onInputValue?: (value: string) => void;

  constructor(options: InputRenderableOptions = {}) {
    super({ focusable: options.focusable ?? true, id: options.id });
    this.value = options.value ?? "";
    this.placeholder = options.placeholder ?? "";
    this.cursorOffset = this.clampCursor(options.cursorOffset ?? this.value.length, this.value);
    this.showCursor = false;
    this.controlledValue = options.value !== undefined;
    this.controlledCursorOffset = options.cursorOffset !== undefined;
    this.onInputValue = options.onInput;
    this.onFocus = options.onFocus;
    this.onBlur = options.onBlur;
  }

  override hydrate(previous: Renderable): void {
    if (!(previous instanceof InputRenderable)) {
      return;
    }

    if (!this.controlledValue) {
      this.value = previous.value;
    }

    if (!this.controlledCursorOffset) {
      this.cursorOffset = previous.cursorOffset;
    }

    this.cursorOffset = this.clampCursor(this.cursorOffset, this.value);
    this.showCursor = previous.focused;
  }

  override focus(): void {
    super.focus();
    if (this.focused) {
      this.showCursor = true;
    }
  }

  override blur(): void {
    super.blur();
    this.showCursor = false;
  }

  insertText(text: string): void {
    if (!text) {
      return;
    }

    const before = this.value.slice(0, this.cursorOffset);
    const after = this.value.slice(this.cursorOffset);
    this.value = `${before}${text}${after}`;
    this.cursorOffset = this.clampCursor(this.cursorOffset + text.length, this.value);
    this.onInputValue?.(this.value);
  }

  deleteBackward(): void {
    if (this.cursorOffset === 0) {
      return;
    }

    const before = this.value.slice(0, this.cursorOffset - 1);
    const after = this.value.slice(this.cursorOffset);
    this.value = `${before}${after}`;
    this.cursorOffset = this.clampCursor(this.cursorOffset - 1, this.value);
    this.onInputValue?.(this.value);
  }

  deleteForward(): void {
    if (this.cursorOffset >= this.value.length) {
      return;
    }

    const before = this.value.slice(0, this.cursorOffset);
    const after = this.value.slice(this.cursorOffset + 1);
    this.value = `${before}${after}`;
    this.cursorOffset = this.clampCursor(this.cursorOffset, this.value);
    this.onInputValue?.(this.value);
  }

  moveCursorLeft(): void {
    this.cursorOffset = this.clampCursor(this.cursorOffset - 1, this.value);
  }

  moveCursorRight(): void {
    this.cursorOffset = this.clampCursor(this.cursorOffset + 1, this.value);
  }

  moveCursorToStart(): void {
    this.cursorOffset = 0;
  }

  moveCursorToEnd(): void {
    this.cursorOffset = this.value.length;
  }

  protected override afterProcessEvent(event: TerminalEvent): void {
    if (event.defaultPrevented) {
      return;
    }

    if (event instanceof KeyboardEventClass && event.type === "keydown") {
      this.handleKeyDown(event);
    }

    if (event instanceof PasteEventClass) {
      this.handlePaste(event);
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    const code = event.code ?? event.key;

    switch (code) {
      case "ArrowLeft":
        this.moveCursorLeft();
        return;
      case "ArrowRight":
        this.moveCursorRight();
        return;
      case "Home":
        this.moveCursorToStart();
        return;
      case "End":
        this.moveCursorToEnd();
        return;
      case "Backspace":
        this.deleteBackward();
        return;
      case "Delete":
        this.deleteForward();
        return;
      default:
        break;
    }

    if (event.modifiers.ctrl || event.modifiers.alt || event.modifiers.meta) {
      return;
    }

    if (event.key.length === 1) {
      this.insertText(event.key);
    }
  }

  private handlePaste(event: PasteEvent): void {
    this.insertText(event.text);
  }

  private clampCursor(offset: number, value: string): number {
    return Math.max(0, Math.min(offset, value.length));
  }
}
