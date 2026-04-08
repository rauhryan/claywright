/** @jsxImportSource @tui/solid-bindings */
import { describe, expect, test } from "bun:test";
import { createSignal, flush } from "solid-js";
import { Errored } from "@tui/solid-bindings";
import { RootNode, render, type TerminalNode } from "../src/jsx-runtime";

function collectTextContent(node: TerminalNode): string {
  const parts: string[] = [];

  function walk(current: TerminalNode): void {
    if (current.type === "text-node") {
      parts.push((current as { value?: string }).value ?? "");
    }

    for (const child of current.children) {
      walk(child);
    }
  }

  walk(node);
  return parts.join("");
}

describe("slot boundary semantics", () => {
  test("layout parent swaps Errored branch without remounting sibling", () => {
    const [shouldThrow, setShouldThrow] = createSignal(false);
    const root = new RootNode();

    function MaybeCrash() {
      if (shouldThrow()) {
        throw new Error("boom");
      }

      return <text>Healthy content</text>;
    }

    const dispose = render(
      () => (
        <box>
          <text id="stable-sibling">Sibling stable</text>
          <Errored fallback={<text>Errored fallback</text>}>
            <MaybeCrash />
          </Errored>
        </box>
      ),
      root,
    );

    const box = root.children[0]!;
    const stableSibling = box.children[0]!;

    expect(collectTextContent(root)).toContain("Healthy content");

    setShouldThrow(true);
    flush();

    expect(box.children[0]).toBe(stableSibling);
    expect(collectTextContent(root)).toContain("Sibling stable");
    expect(collectTextContent(root)).toContain("Errored fallback");

    dispose();
  });

  test("text parent swaps Errored branch without losing surrounding text", () => {
    const [shouldThrow, setShouldThrow] = createSignal(false);
    const root = new RootNode();

    function MaybeCrash() {
      if (shouldThrow()) {
        throw new Error("boom");
      }

      return "healthy";
    }

    const dispose = render(
      () => (
        <text>
          prefix <Errored fallback={"fallback"}>{MaybeCrash()}</Errored> suffix
        </text>
      ),
      root,
    );

    expect(collectTextContent(root)).toBe("prefix healthy suffix");

    setShouldThrow(true);
    flush();

    expect(collectTextContent(root)).toBe("prefix fallback suffix");

    dispose();
  });

  test("Errored reset restores original branch shape", () => {
    const [shouldThrow, setShouldThrow] = createSignal(false);
    const root = new RootNode();

    function MaybeCrash() {
      if (shouldThrow()) {
        throw new Error("boom");
      }

      return <text id="healthy-node">Healthy content</text>;
    }

    const dispose = render(
      () => (
        <box>
          <Errored fallback={<text id="fallback-node">Errored fallback</text>}>
            <MaybeCrash />
          </Errored>
        </box>
      ),
      root,
    );

    const box = root.children[0]!;

    setShouldThrow(true);
    flush();

    expect(collectTextContent(root)).toContain("Errored fallback");

    setShouldThrow(false);
    flush();

    expect(box.children).toHaveLength(1);
    expect(collectTextContent(root)).toContain("Healthy content");
    expect(collectTextContent(root)).not.toContain("Errored fallback");

    dispose();
  });
});
