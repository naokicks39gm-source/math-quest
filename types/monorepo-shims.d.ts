declare module "react-canvas-draw";
declare module "react-katex";

declare module "node:sqlite" {
  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): {
      run: (...args: unknown[]) => { changes?: number; lastInsertRowid?: number | bigint };
      get: (...args: unknown[]) => Record<string, unknown> | undefined;
      all: (...args: unknown[]) => Array<Record<string, unknown>>;
    };
  }
}
