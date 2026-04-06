declare module "@babel/core" {
  export function transformAsync(
    code: string,
    options?: Record<string, unknown>,
  ): Promise<{ code?: string | null } | null>;
}

declare module "@babel/preset-typescript" {
  const preset: unknown;
  export default preset;
}

declare module "babel-preset-solid" {
  const preset: unknown;
  export default preset;
}
