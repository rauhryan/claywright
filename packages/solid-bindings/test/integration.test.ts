import { test, expect, describe } from "bun:test"
import { ElementNode, TextNode } from "../src/jsx-runtime"
import { createRenderableTree } from "../src/reconciler"
import { renderableToOps } from "../src/renderable-to-ops"
import { ElementRenderable } from "../src/ElementRenderable"

describe("reconciler", () => {
  test("creates Renderable tree from ElementNode", () => {
    const vnode = new ElementNode("box")
    vnode.props.focusable = true
    const child = new ElementNode("text")
    vnode.children.push(child)

    const renderable = createRenderableTree(vnode)

    expect(renderable).toBeInstanceOf(ElementRenderable)
    expect(renderable?.id).toBe(vnode.id)
    expect(renderable?.focusable).toBe(true)
    expect(renderable?.children).toHaveLength(1)
  })

  test("skips TextNodes", () => {
    const textNode = new TextNode("hello")
    const renderable = createRenderableTree(textNode)
    expect(renderable).toBeNull()
  })

  test("creates nested structure", () => {
    const root = new ElementNode("box")
    const child1 = new ElementNode("box")
    const child2 = new ElementNode("text")
    root.children.push(child1, child2)

    const grandchild = new ElementNode("text")
    child1.children.push(grandchild)

    const renderable = createRenderableTree(root)

    expect(renderable).toBeInstanceOf(ElementRenderable)
    expect(renderable?.children).toHaveLength(2)
    expect(renderable?.children[0].children).toHaveLength(1)
  })
})

describe("renderableToOps", () => {
  test("converts box element to ops", () => {
    const vnode = new ElementNode("box")
    vnode.props.bg = 0xff0000
    const renderable = createRenderableTree(vnode)

    const ops = renderable ? renderableToOps(renderable) : []

    expect(ops.length).toBeGreaterThan(0)
    expect(ops[0]).toHaveProperty("name")
    expect(ops[ops.length - 1]).toHaveProperty("id")
  })

  test("converts text element to ops", () => {
    const vnode = new ElementNode("text")
    const textChild = new TextNode("Hello")
    vnode.children.push(textChild)

    const renderable = createRenderableTree(vnode)
    const ops = renderable ? renderableToOps(renderable) : []

    expect(ops.length).toBe(1)
    expect(ops[0]).toHaveProperty("content")
    expect((ops[0] as any).content).toBe("Hello")
  })

  test("converts nested structure", () => {
    const root = new ElementNode("box")
    const child = new ElementNode("text")
    const textChild = new TextNode("Hello")
    child.children.push(textChild)
    root.children.push(child)

    const renderable = createRenderableTree(root)
    const ops = renderable ? renderableToOps(renderable) : []

    expect(ops.length).toBe(3) // open, text, close
    expect(ops[0]).toHaveProperty("name")
    expect(ops[1]).toHaveProperty("content")
    expect((ops[1] as any).content).toBe("Hello")
    expect(ops[2]).toHaveProperty("id")
  })
})
