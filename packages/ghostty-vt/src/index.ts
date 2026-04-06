import { dlopen, FFIType, ptr, toArrayBuffer } from "bun:ffi";

const libPath = new URL("../lib/libghostty-wrapper.dylib", import.meta.url).pathname;

const lib = dlopen(libPath, {
  ghostty_wrapper_terminal_new: {
    args: ["u16", "u16", "usize", "usize"],
    returns: FFIType.int,
  },
  ghostty_wrapper_terminal_free: {
    args: ["usize"],
    returns: FFIType.void,
  },
  ghostty_wrapper_terminal_write: {
    args: ["usize", "pointer", "usize"],
    returns: FFIType.void,
  },
  ghostty_wrapper_terminal_resize: {
    args: ["usize", "u16", "u16"],
    returns: FFIType.int,
  },
  ghostty_wrapper_formatter_new: {
    args: ["usize", "usize"],
    returns: FFIType.int,
  },
  ghostty_wrapper_formatter_free: {
    args: ["usize"],
    returns: FFIType.void,
  },
  ghostty_wrapper_formatter_format: {
    args: ["usize", "usize", "usize"],
    returns: FFIType.int,
  },
  ghostty_wrapper_free: {
    args: ["usize", "usize"],
    returns: FFIType.void,
  },
  ghostty_wrapper_mouse_encoder_new: {
    args: ["usize"],
    returns: FFIType.int,
  },
  ghostty_wrapper_mouse_encoder_free: {
    args: ["usize"],
    returns: FFIType.void,
  },
  ghostty_wrapper_mouse_encoder_set_format: {
    args: ["usize", "i32"],
    returns: FFIType.void,
  },
  ghostty_wrapper_mouse_encoder_set_tracking: {
    args: ["usize", "i32"],
    returns: FFIType.void,
  },
  ghostty_wrapper_mouse_encoder_set_size: {
    args: ["usize", "u32", "u32", "u32", "u32"],
    returns: FFIType.void,
  },
  ghostty_wrapper_mouse_event_new: {
    args: ["usize"],
    returns: FFIType.int,
  },
  ghostty_wrapper_mouse_event_free: {
    args: ["usize"],
    returns: FFIType.void,
  },
  ghostty_wrapper_mouse_event_set_action: {
    args: ["usize", "i32"],
    returns: FFIType.void,
  },
  ghostty_wrapper_mouse_event_set_button: {
    args: ["usize", "i32"],
    returns: FFIType.void,
  },
  ghostty_wrapper_mouse_event_clear_button: {
    args: ["usize"],
    returns: FFIType.void,
  },
  ghostty_wrapper_mouse_event_set_mods: {
    args: ["usize", "u8"],
    returns: FFIType.void,
  },
  ghostty_wrapper_mouse_event_set_position: {
    args: ["usize", "f32", "f32"],
    returns: FFIType.void,
  },
  ghostty_wrapper_mouse_encode: {
    args: ["usize", "usize", "pointer", "usize", "usize"],
    returns: FFIType.int,
  },
  ghostty_wrapper_grid_ref: {
    args: ["usize", "u16", "u16", "pointer"],
    returns: FFIType.int,
  },
  ghostty_wrapper_cell_get_codepoint: {
    args: ["pointer", "pointer"],
    returns: FFIType.int,
  },
  ghostty_wrapper_cell_get_has_text: {
    args: ["pointer", "pointer"],
    returns: FFIType.int,
  },
  ghostty_wrapper_cell_get_wide: {
    args: ["pointer", "pointer"],
    returns: FFIType.int,
  },
  ghostty_wrapper_cell_get_graphemes: {
    args: ["pointer", "pointer", "usize", "pointer"],
    returns: FFIType.int,
  },
  ghostty_wrapper_cell_style_flags: {
    args: ["pointer", "pointer"],
    returns: FFIType.int,
  },
  ghostty_wrapper_cell_underline: {
    args: ["pointer", "pointer"],
    returns: FFIType.int,
  },
  ghostty_wrapper_cell_fg_color: {
    args: ["pointer", "pointer", "pointer"],
    returns: FFIType.int,
  },
  ghostty_wrapper_cell_bg_color: {
    args: ["pointer", "pointer", "pointer"],
    returns: FFIType.int,
  },
  ghostty_wrapper_terminal_mode_get: {
    args: ["usize", "u16", "pointer"],
    returns: FFIType.int,
  },
  ghostty_wrapper_terminal_active_screen: {
    args: ["usize", "pointer"],
    returns: FFIType.int,
  },
  ghostty_wrapper_style_get: {
    args: ["pointer", "pointer"],
    returns: FFIType.int,
  },
});

export interface TerminalOptions {
  cols?: number;
  rows?: number;
  maxScrollback?: number;
}

export interface TerminalCell {
  text: string;
  codepoint: number;
  hasText: boolean;
  wide: number;
}

export interface TerminalCellStyle {
  bold: boolean;
  italic: boolean;
  faint: boolean;
  blink: boolean;
  inverse: boolean;
  invisible: boolean;
  strikethrough: boolean;
  overline: boolean;
  underline: number;
  fg: { tag: number; palette: number };
  bg: { tag: number; palette: number };
}

export enum ActiveScreen {
  Primary = 0,
  Alternate = 1,
}

const MODE_X10_MOUSE = 9;
const MODE_NORMAL_MOUSE = 1000;
const MODE_BUTTON_MOUSE = 1002;
const MODE_ANY_MOUSE = 1003;
const MODE_ALT_SCREEN_LEGACY = 47;
const MODE_ALT_SCREEN = 1047;
const MODE_ALT_SCREEN_SAVE = 1049;

export class GhosttyTerminal {
  private handle: bigint;
  private cols: number;
  private rows: number;

  constructor(options: TerminalOptions = {}) {
    this.cols = options.cols ?? 80;
    this.rows = options.rows ?? 24;
    const maxScrollback = options.maxScrollback ?? 1000;

    const outPtr = new BigUint64Array(1);
    const result = lib.symbols.ghostty_wrapper_terminal_new(
      this.cols,
      this.rows,
      maxScrollback,
      ptr(outPtr),
    );
    if (result !== 0) {
      throw new Error(`Failed to create terminal: ${result}`);
    }
    this.handle = outPtr[0];
  }

  write(data: string | Uint8Array): void {
    const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
    lib.symbols.ghostty_wrapper_terminal_write(this.handle, ptr(bytes), bytes.length);
  }

  resize(cols: number, rows: number): void {
    this.cols = cols;
    this.rows = rows;
    const result = lib.symbols.ghostty_wrapper_terminal_resize(this.handle, cols, rows);
    if (result !== 0) {
      throw new Error(`Failed to resize terminal: ${result}`);
    }
  }

  getScreen(): string {
    const formatterPtr = new BigUint64Array(1);
    const result = lib.symbols.ghostty_wrapper_formatter_new(this.handle, ptr(formatterPtr));
    if (result !== 0) {
      throw new Error(`Failed to create formatter: ${result}`);
    }
    const formatter = formatterPtr[0];

    try {
      const bufPtr = new BigUint64Array(1);
      const lenPtr = new BigUint64Array(1);
      const fmtResult = lib.symbols.ghostty_wrapper_formatter_format(
        formatter,
        ptr(bufPtr),
        ptr(lenPtr),
      );
      if (fmtResult !== 0) {
        throw new Error(`Failed to format: ${fmtResult}`);
      }

      const buf = Number(bufPtr[0]);
      const len = Number(lenPtr[0]);

      if (len === 0 || buf === 0) {
        return "";
      }

      try {
        const buffer = toArrayBuffer(buf, 0, len);
        if (!buffer) {
          return "";
        }
        return new TextDecoder().decode(buffer);
      } finally {
        lib.symbols.ghostty_wrapper_free(buf, len);
      }
    } finally {
      lib.symbols.ghostty_wrapper_formatter_free(formatter);
    }
  }

  private getRef(col: number, row: number): Uint8Array {
    const refBuf = new Uint8Array(32);
    const result = lib.symbols.ghostty_wrapper_grid_ref(this.handle, col, row, ptr(refBuf));
    if (result !== 0) {
      throw new Error(`Failed to get grid ref: ${result}`);
    }

    return refBuf;
  }

  getCell(col: number, row: number): TerminalCell {
    const refBuf = this.getRef(col, row);

    const codepointBuf = new Uint32Array(1);
    const hasTextBuf = new Uint8Array(1);
    const wideBuf = new Int32Array(1);

    lib.symbols.ghostty_wrapper_cell_get_codepoint(ptr(refBuf), ptr(codepointBuf));
    lib.symbols.ghostty_wrapper_cell_get_has_text(ptr(refBuf), ptr(hasTextBuf));
    lib.symbols.ghostty_wrapper_cell_get_wide(ptr(refBuf), ptr(wideBuf));

    const hasText = hasTextBuf[0] !== 0;
    const codepoint = codepointBuf[0];
    const wide = wideBuf[0];

    let text = "";
    if (hasText && codepoint > 0) {
      text = String.fromCodePoint(codepoint);
    }

    return { text, codepoint, hasText, wide };
  }

  getCellStyle(col: number, row: number): TerminalCellStyle {
    const refBuf = this.getRef(col, row);
    const flagsBuf = new Uint8Array(1);
    const underlineBuf = new Uint8Array(1);
    const fgTagBuf = new Uint8Array(1);
    const fgPaletteBuf = new Uint8Array(1);
    const bgTagBuf = new Uint8Array(1);
    const bgPaletteBuf = new Uint8Array(1);

    const flagsResult = lib.symbols.ghostty_wrapper_cell_style_flags(ptr(refBuf), ptr(flagsBuf));
    if (flagsResult !== 0) {
      throw new Error(`Failed to get style flags: ${flagsResult}`);
    }

    const underlineResult = lib.symbols.ghostty_wrapper_cell_underline(
      ptr(refBuf),
      ptr(underlineBuf),
    );
    if (underlineResult !== 0) {
      throw new Error(`Failed to get underline: ${underlineResult}`);
    }

    const fgResult = lib.symbols.ghostty_wrapper_cell_fg_color(
      ptr(refBuf),
      ptr(fgTagBuf),
      ptr(fgPaletteBuf),
    );
    if (fgResult !== 0) {
      throw new Error(`Failed to get fg color: ${fgResult}`);
    }

    const bgResult = lib.symbols.ghostty_wrapper_cell_bg_color(
      ptr(refBuf),
      ptr(bgTagBuf),
      ptr(bgPaletteBuf),
    );
    if (bgResult !== 0) {
      throw new Error(`Failed to get bg color: ${bgResult}`);
    }

    const flags = flagsBuf[0];
    return {
      bold: (flags & (1 << 0)) !== 0,
      italic: (flags & (1 << 1)) !== 0,
      faint: (flags & (1 << 2)) !== 0,
      blink: (flags & (1 << 3)) !== 0,
      inverse: (flags & (1 << 4)) !== 0,
      invisible: (flags & (1 << 5)) !== 0,
      strikethrough: (flags & (1 << 6)) !== 0,
      overline: (flags & (1 << 7)) !== 0,
      underline: underlineBuf[0],
      fg: { tag: fgTagBuf[0], palette: fgPaletteBuf[0] },
      bg: { tag: bgTagBuf[0], palette: bgPaletteBuf[0] },
    };
  }

  private getMode(mode: number): boolean {
    const out = new Uint8Array(1);
    const result = lib.symbols.ghostty_wrapper_terminal_mode_get(this.handle, mode, ptr(out));
    if (result !== 0) {
      throw new Error(`Failed to get mode ${mode}: ${result}`);
    }

    return out[0] !== 0;
  }

  getActiveScreen(): ActiveScreen {
    const out = new Uint32Array(1);
    const result = lib.symbols.ghostty_wrapper_terminal_active_screen(this.handle, ptr(out));
    if (result !== 0) {
      throw new Error(`Failed to get active screen: ${result}`);
    }

    return out[0] as ActiveScreen;
  }

  isAltScreen(): boolean {
    return (
      this.getActiveScreen() === ActiveScreen.Alternate ||
      this.getMode(MODE_ALT_SCREEN_LEGACY) ||
      this.getMode(MODE_ALT_SCREEN) ||
      this.getMode(MODE_ALT_SCREEN_SAVE)
    );
  }

  getMouseTrackingMode(): MouseTracking {
    if (this.getMode(MODE_ANY_MOUSE)) return MouseTracking.Any;
    if (this.getMode(MODE_BUTTON_MOUSE)) return MouseTracking.Button;
    if (this.getMode(MODE_NORMAL_MOUSE)) return MouseTracking.Normal;
    if (this.getMode(MODE_X10_MOUSE)) return MouseTracking.X10;
    return MouseTracking.None;
  }

  free(): void {
    lib.symbols.ghostty_wrapper_terminal_free(this.handle);
  }
}

export enum MouseAction {
  Press = 0,
  Release = 1,
  Motion = 2,
}

export enum MouseButton {
  Unknown = 0,
  Left = 1,
  Right = 2,
  Middle = 3,
  Four = 4,
  Five = 5,
  Six = 6,
  Seven = 7,
  Eight = 8,
  Nine = 9,
  Ten = 10,
  Eleven = 11,
}

export enum MouseFormat {
  X10 = 0,
  UTF8 = 1,
  SGR = 2,
  URXVT = 3,
  SGRPixels = 4,
}

export enum MouseTracking {
  None = 0,
  X10 = 1,
  Normal = 2,
  Button = 3,
  Any = 4,
}

export enum Modifiers {
  None = 0,
  Shift = 1,
  Alt = 2,
  Ctrl = 4,
  Super = 8,
}

export interface MouseOptions {
  format?: MouseFormat;
  tracking?: MouseTracking;
  cellWidth?: number;
  cellHeight?: number;
}

export class MouseEncoder {
  private handle: bigint;

  constructor(options: MouseOptions = {}) {
    const outPtr = new BigUint64Array(1);
    const result = lib.symbols.ghostty_wrapper_mouse_encoder_new(ptr(outPtr));
    if (result !== 0) {
      throw new Error(`Failed to create mouse encoder: ${result}`);
    }
    this.handle = outPtr[0];

    if (options.format !== undefined) {
      lib.symbols.ghostty_wrapper_mouse_encoder_set_format(this.handle, options.format);
    }
    if (options.tracking !== undefined) {
      lib.symbols.ghostty_wrapper_mouse_encoder_set_tracking(this.handle, options.tracking);
    }
  }

  setSize(screenWidth: number, screenHeight: number, cellWidth: number, cellHeight: number): void {
    lib.symbols.ghostty_wrapper_mouse_encoder_set_size(
      this.handle,
      screenWidth,
      screenHeight,
      cellWidth,
      cellHeight,
    );
  }

  encode(event: MouseEvent): string {
    const buf = new Uint8Array(64);
    const lenPtr = new BigUint64Array(1);

    const result = lib.symbols.ghostty_wrapper_mouse_encode(
      this.handle,
      event.getHandle(),
      ptr(buf),
      buf.length,
      ptr(lenPtr),
    );

    if (result !== 0) {
      throw new Error(`Failed to encode mouse event: ${result}`);
    }

    const len = Number(lenPtr[0]);
    if (len === 0) {
      return "";
    }

    return new TextDecoder().decode(buf.slice(0, len));
  }

  free(): void {
    lib.symbols.ghostty_wrapper_mouse_encoder_free(this.handle);
  }
}

export class MouseEvent {
  private handle: bigint;

  constructor() {
    const outPtr = new BigUint64Array(1);
    const result = lib.symbols.ghostty_wrapper_mouse_event_new(ptr(outPtr));
    if (result !== 0) {
      throw new Error(`Failed to create mouse event: ${result}`);
    }
    this.handle = outPtr[0];
  }

  setAction(action: MouseAction): void {
    lib.symbols.ghostty_wrapper_mouse_event_set_action(this.handle, action);
  }

  setButton(button: MouseButton): void {
    if (button === MouseButton.Unknown) {
      lib.symbols.ghostty_wrapper_mouse_event_clear_button(this.handle);
      return;
    }

    lib.symbols.ghostty_wrapper_mouse_event_set_button(this.handle, button);
  }

  setModifiers(mods: Modifiers): void {
    lib.symbols.ghostty_wrapper_mouse_event_set_mods(this.handle, mods);
  }

  setPosition(x: number, y: number): void {
    lib.symbols.ghostty_wrapper_mouse_event_set_position(this.handle, x, y);
  }

  getHandle(): bigint {
    return this.handle;
  }

  free(): void {
    lib.symbols.ghostty_wrapper_mouse_event_free(this.handle);
  }
}

export function createTerminal(options?: TerminalOptions): GhosttyTerminal {
  return new GhosttyTerminal(options);
}

export function createMouseEncoder(options?: MouseOptions): MouseEncoder {
  return new MouseEncoder(options);
}

export function createMouseEvent(): MouseEvent {
  return new MouseEvent();
}
