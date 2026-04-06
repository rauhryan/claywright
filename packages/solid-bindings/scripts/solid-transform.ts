import { transformAsync } from "@babel/core";
import ts from "@babel/preset-typescript";
import solid from "babel-preset-solid";

export async function transformSolidJSX(
  code: string,
  filename: string,
  moduleName: string,
): Promise<string> {
  const result = await transformAsync(code, {
    filename,
    presets: [[solid, { moduleName, generate: "universal" }], [ts]],
  });
  return result?.code ?? code;
}
