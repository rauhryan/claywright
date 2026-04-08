/** @jsxImportSource @tui/solid-bindings */
import { describe, expect, test } from "bun:test";
import { createRenderEffect, createSignal, flush } from "solid-js";
import { Errored } from "@tui/solid-bindings";
import { RootNode, createComponent, render, type TerminalNode } from "../src/jsx-runtime";

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

describe("mounted Errored boundary", () => {
  test("swaps to fallback for direct createComponent call shape", () => {
    const [shouldThrow, setShouldThrow] = createSignal(false);
    const root = new RootNode();

    function MaybeCrash() {
      if (shouldThrow()) {
        throw new Error("boom");
      }

      return <text>Healthy content</text>;
    }

    let boundaryValue: unknown;
    const dispose = render(() => {
      const boundary = createComponent(Errored, {
        get fallback() {
          return <text>Errored fallback</text>;
        },
        get children() {
          return createComponent(MaybeCrash, {});
        },
      });

      if (typeof boundary === "function") {
        createRenderEffect(
          () => boundary(),
          (value) => {
            boundaryValue = value;
          },
        );
      } else {
        boundaryValue = boundary;
      }

      return boundary;
    }, root);

    expect(collectTextContent(root)).toContain("Healthy content");

    setShouldThrow(true);
    flush();

    expect(boundaryValue).toBeDefined();
    expect(boundaryValue).not.toBeNull();
    expect(boundaryValue).not.toBe("Healthy content");
    expect(collectTextContent(root)).toContain("Errored fallback");

    dispose();
  });

  test("swaps to fallback for JSX component child shape", () => {
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
          <Errored fallback={<text>Errored fallback</text>}>
            <MaybeCrash />
          </Errored>
        </box>
      ),
      root,
    );

    expect(collectTextContent(root)).toContain("Healthy content");

    setShouldThrow(true);
    flush();

    expect(collectTextContent(root)).toContain("Errored fallback");

    dispose();
  });
});
