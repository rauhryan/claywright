export abstract class TerminalEvent {
  readonly type: string;
  readonly target: Renderable | null;

  private _propagationStopped: boolean = false;
  private _defaultPrevented: boolean = false;

  constructor(type: string, target: Renderable | null) {
    this.type = type;
    this.target = target;
  }

  get propagationStopped(): boolean {
    return this._propagationStopped;
  }

  get defaultPrevented(): boolean {
    return this._defaultPrevented;
  }

  stopPropagation(): void {
    this._propagationStopped = true;
  }

  preventDefault(): void {
    this._defaultPrevented = true;
  }
}

export interface MouseModifiers {
  shift: boolean;
  alt: boolean;
  ctrl: boolean;
}

export class MouseEvent extends TerminalEvent {
  readonly x: number;
  readonly y: number;
  readonly button: number;
  readonly modifiers: MouseModifiers;

  constructor(
    type: string,
    target: Renderable | null,
    options: {
      x: number;
      y: number;
      button: number;
      modifiers?: MouseModifiers;
    },
  ) {
    super(type, target);
    this.x = options.x;
    this.y = options.y;
    this.button = options.button;
    this.modifiers = options.modifiers ?? { shift: false, alt: false, ctrl: false };
  }
}

export interface KeyboardModifiers {
  shift: boolean;
  alt: boolean;
  ctrl: boolean;
  meta: boolean;
}

export class KeyboardEvent extends TerminalEvent {
  readonly key: string;
  readonly code?: string;
  readonly modifiers: KeyboardModifiers;
  readonly repeated: boolean;

  constructor(
    type: string,
    target: Renderable | null,
    options: {
      key: string;
      code?: string;
      modifiers?: KeyboardModifiers;
      repeated?: boolean;
    },
  ) {
    super(type, target);
    this.key = options.key;
    this.code = options.code;
    this.modifiers = options.modifiers ?? { shift: false, alt: false, ctrl: false, meta: false };
    this.repeated = options.repeated ?? false;
  }
}

export class PasteEvent extends TerminalEvent {
  readonly text: string;

  constructor(target: Renderable | null, text: string) {
    super("paste", target);
    this.text = text;
  }
}
