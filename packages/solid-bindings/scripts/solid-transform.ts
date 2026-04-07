import { transformAsync } from "@babel/core";
import ts from "@babel/preset-typescript";
import solid from "babel-preset-solid";

export async function transformSolidJSX(
  code: string,
  filename: string,
  moduleName: string,
): Promise<string> {
  const transformed = await transformAsync(code, {
    filename,
    configFile: false,
    babelrc: false,
    presets: [[solid, { moduleName, generate: "universal" }], [ts]],
  });
  return transformed?.code ?? code;
}
