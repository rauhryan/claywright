import { createTerm, createInput, open, close, text, grow, type Op, type InputEvent } from "clayterm"
import { Renderable } from "./Renderable.js"
import { MouseEvent, KeyboardEvent, PasteEvent, type MouseModifiers, type KeyboardModifiers } from "./events.js"

export interface RendererOptions {
  width?: number
  height?: number
}

export class Renderer {
  private term: Awaited<ReturnType<typeof createTerm>> | null = null
  private input: Awaited<ReturnType<typeof createInput>> | null = null
  
  readonly width: number
  readonly height: number
  
  focusedRenderable: Renderable | null = null
  rootRenderable: Renderable | null = null
  
  private renderablesById: Map<string, Renderable> = new Map()
  
  constructor(options: RendererOptions = {}) {
    this.width = options.width ?? process.stdout.columns ?? 80
    this.height = options.height ?? process.stdout.rows ?? 24
  }
  
  async init(): Promise<void> {
    this.term = await createTerm({ width: this.width, height: this.height })
    this.input = await createInput()
  }
  
  setRoot(renderable: Renderable): void {
    // Clear previous ID map
    this.renderablesById.clear()
    
    this.rootRenderable = renderable
    this.buildIdMap(renderable)
  }
  
  private buildIdMap(renderable: Renderable): void {
    this.renderablesById.set(renderable.id, renderable)
    for (const child of renderable.children) {
      this.buildIdMap(child)
    }
  }
  
  findRenderable(id: string): Renderable | undefined {
    return this.renderablesById.get(id)
  }
  
  focusRenderable(renderable: Renderable): void {
    if (this.focusedRenderable === renderable) return
    
    if (this.focusedRenderable) {
      this.focusedRenderable.blur()
    }
    
    this.focusedRenderable = renderable
    renderable.focus()
  }
  
  blurRenderable(renderable: Renderable): void {
    if (this.focusedRenderable !== renderable) return
    
    renderable.blur()
    this.focusedRenderable = null
  }
  
  render(ops: Op[]): string {
    if (!this.term) {
      throw new Error("Renderer not initialized. Call init() first.")
    }
    
    const { output, events } = this.term.render(ops)
    
    // Process events from clayterm
    for (const event of events) {
      this.handlePointerEvent(event)
    }
    
    return output
  }
  
  private handlePointerEvent(event: any): void {
    if (!event.id) return
    
    const renderable = this.findRenderable(event.id)
    if (!renderable) return
    
    // Create MouseEvent
    const mouseEvent = new MouseEvent(
      event.type === "pointerclick" ? "click" : 
      event.type === "pointerdown" ? "mousedown" :
      event.type === "pointerup" ? "mouseup" :
      event.type === "pointermove" ? "mousemove" : event.type,
      renderable,
      {
        x: event.x ?? 0,
        y: event.y ?? 0,
        button: event.button ?? 0,
        modifiers: {
          shift: event.shift ?? false,
          alt: event.alt ?? false,
          ctrl: event.ctrl ?? false,
        }
      }
    )
    
    // Dispatch event (bubbles through tree)
    renderable.processEvent(mouseEvent)
    
    // Auto-focus on left click, unless prevented
    if (event.type === "pointerclick" && 
        event.button === 0 && 
        !mouseEvent.defaultPrevented) {
      const focusable = renderable.getFocusableAncestor()
      if (focusable) {
        this.focusRenderable(focusable)
      }
    }
  }
  
  handleInput(bytes: Uint8Array): InputEvent[] {
    if (!this.input) {
      throw new Error("Renderer not initialized. Call init() first.")
    }
    
    const { events } = this.input.scan(bytes)
    
    for (const event of events) {
      this.processInputEvent(event)
    }
    
    return events
  }
  
  private processInputEvent(event: InputEvent): void {
    if (event.type === "keydown" || event.type === "keyrepeat") {
      const keyEvent = new KeyboardEvent(
        "keydown",
        this.focusedRenderable,
        {
          key: event.key ?? "",
          code: event.code,
          modifiers: {
            shift: event.shift ?? false,
            alt: event.alt ?? false,
            ctrl: event.ctrl ?? false,
            meta: event.meta ?? false,
          },
          repeated: event.type === "keyrepeat",
        }
      )
      
      // Dispatch to focused element
      if (this.focusedRenderable) {
        this.focusedRenderable.processEvent(keyEvent)
      }
    } else if (event.type === "keyup") {
      const keyEvent = new KeyboardEvent(
        "keyup",
        this.focusedRenderable,
        {
          key: event.key ?? "",
          code: event.code,
          modifiers: {
            shift: event.shift ?? false,
            alt: event.alt ?? false,
            ctrl: event.ctrl ?? false,
            meta: event.meta ?? false,
          },
        }
      )
      
      if (this.focusedRenderable) {
        this.focusedRenderable.processEvent(keyEvent)
      }
    } else if (event.type === "paste") {
      const pasteEvent = new PasteEvent(
        this.focusedRenderable,
        event.text ?? ""
      )
      
      if (this.focusedRenderable) {
        this.focusedRenderable.processEvent(pasteEvent)
      }
    }
  }
  
  destroy(): void {
    if (this.rootRenderable) {
      this.rootRenderable.destroy()
    }
    this.renderablesById.clear()
    this.focusedRenderable = null
    this.rootRenderable = null
    this.term = null
    this.input = null
  }
}
