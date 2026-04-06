import { test, expect, describe } from "bun:test"
import { Renderable, MouseEvent, KeyboardEvent, PasteEvent } from "../src/index.js"

describe("Renderable", () => {
  test("creates with id", () => {
    const renderable = new Renderable({ id: "test" })
    expect(renderable.id).toBe("test")
  })
  
  test("auto-generates id if not provided", () => {
    const renderable = new Renderable()
    expect(renderable.id).toMatch(/^renderable_\d+$/)
  })
  
  test("focusable defaults to false", () => {
    const renderable = new Renderable()
    expect(renderable.focusable).toBe(false)
  })
  
  test("can set focusable via options", () => {
    const renderable = new Renderable({ focusable: true })
    expect(renderable.focusable).toBe(true)
  })
  
  test("focus() sets focused to true", () => {
    const renderable = new Renderable({ focusable: true })
    renderable.focus()
    expect(renderable.focused).toBe(true)
  })
  
  test("focus() does nothing if not focusable", () => {
    const renderable = new Renderable({ focusable: false })
    renderable.focus()
    expect(renderable.focused).toBe(false)
  })
  
  test("blur() sets focused to false", () => {
    const renderable = new Renderable({ focusable: true })
    renderable.focus()
    renderable.blur()
    expect(renderable.focused).toBe(false)
  })
})

describe("Renderable tree", () => {
  test("add() sets parent", () => {
    const parent = new Renderable({ id: "parent" })
    const child = new Renderable({ id: "child" })
    
    parent.add(child)
    
    expect(child.parent).toBe(parent)
    expect(parent.children).toContain(child)
  })
  
  test("remove() clears parent", () => {
    const parent = new Renderable({ id: "parent" })
    const child = new Renderable({ id: "child" })
    
    parent.add(child)
    parent.remove(child)
    
    expect(child.parent).toBe(null)
    expect(parent.children).not.toContain(child)
  })
  
  test("getRenderableById() finds nested children", () => {
    const root = new Renderable({ id: "root" })
    const child1 = new Renderable({ id: "child1" })
    const child2 = new Renderable({ id: "child2" })
    const grandchild = new Renderable({ id: "grandchild" })
    
    root.add(child1)
    root.add(child2)
    child1.add(grandchild)
    
    expect(root.getRenderableById("grandchild")).toBe(grandchild)
    expect(root.getRenderableById("nonexistent")).toBeUndefined()
  })
  
  test("getFocusableAncestor() walks up tree", () => {
    const root = new Renderable({ id: "root", focusable: true })
    const child = new Renderable({ id: "child" })
    const grandchild = new Renderable({ id: "grandchild" })
    
    root.add(child)
    child.add(grandchild)
    
    expect(grandchild.getFocusableAncestor()).toBe(root)
  })
})

describe("Event bubbling", () => {
  test("processEvent() bubbles to parent", () => {
    const parent = new Renderable({ id: "parent" })
    const child = new Renderable({ id: "child" })
    parent.add(child)
    
    let parentGotEvent = false
    parent.onClick = () => parentGotEvent = true
    
    const event = new MouseEvent("click", child, { x: 0, y: 0, button: 0 })
    child.processEvent(event)
    
    expect(parentGotEvent).toBe(true)
  })
  
  test("stopPropagation() stops bubbling", () => {
    const parent = new Renderable({ id: "parent" })
    const child = new Renderable({ id: "child" })
    parent.add(child)
    
    let parentGotEvent = false
    parent.onClick = () => parentGotEvent = true
    child.onClick = (e) => e.stopPropagation()
    
    const event = new MouseEvent("click", child, { x: 0, y: 0, button: 0 })
    child.processEvent(event)
    
    expect(parentGotEvent).toBe(false)
  })
})

describe("Events", () => {
  test("MouseEvent has correct properties", () => {
    const target = new Renderable({ id: "target" })
    const event = new MouseEvent("click", target, {
      x: 10,
      y: 20,
      button: 0,
      modifiers: { shift: true, alt: false, ctrl: false }
    })
    
    expect(event.type).toBe("click")
    expect(event.target).toBe(target)
    expect(event.x).toBe(10)
    expect(event.y).toBe(20)
    expect(event.button).toBe(0)
    expect(event.modifiers.shift).toBe(true)
  })
  
  test("KeyboardEvent has correct properties", () => {
    const target = new Renderable({ id: "target" })
    const event = new KeyboardEvent("keydown", target, {
      key: "a",
      code: "KeyA",
      modifiers: { shift: false, alt: false, ctrl: true, meta: false }
    })
    
    expect(event.type).toBe("keydown")
    expect(event.key).toBe("a")
    expect(event.code).toBe("KeyA")
    expect(event.modifiers.ctrl).toBe(true)
  })
  
  test("preventDefault() sets flag", () => {
    const target = new Renderable({ id: "target" })
    const event = new MouseEvent("click", target, { x: 0, y: 0, button: 0 })
    
    expect(event.defaultPrevented).toBe(false)
    event.preventDefault()
    expect(event.defaultPrevented).toBe(true)
  })
})

describe("Lifecycle", () => {
  test("destroy() removes from parent", () => {
    const parent = new Renderable({ id: "parent" })
    const child = new Renderable({ id: "child" })
    parent.add(child)
    
    child.destroy()
    
    expect(child.isDestroyed).toBe(true)
    expect(parent.children).not.toContain(child)
  })
  
  test("destroy() destroys children recursively", () => {
    const parent = new Renderable({ id: "parent" })
    const child = new Renderable({ id: "child" })
    parent.add(child)
    
    parent.destroy()
    
    expect(parent.isDestroyed).toBe(true)
    expect(child.isDestroyed).toBe(true)
  })
  
  test("destroy() blurs if focused", () => {
    const renderable = new Renderable({ id: "test", focusable: true })
    renderable.focus()
    expect(renderable.focused).toBe(true)
    
    renderable.destroy()
    expect(renderable.focused).toBe(false)
  })
})
