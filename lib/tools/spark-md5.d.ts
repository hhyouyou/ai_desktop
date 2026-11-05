/**
 * spark-md5 没有随包类型，也没有 @types 包，这里手写最小声明。
 * 只声明工具用到的部分：增量 ArrayBuffer 摘要（文件分块计算）。
 */
declare module "spark-md5" {
  interface SparkMD5Context {
    append(chunk: string | ArrayBuffer | Uint8Array): SparkMD5Context;
    end(raw?: boolean): string;
    reset(): SparkMD5Context;
    getState(): unknown;
    setState(state: unknown): void;
    destroy(): void;
  }

  interface SparkMD5Static {
    new (): SparkMD5Context;
    ArrayBuffer: new () => SparkMD5Context;
    hash(data: string, raw?: boolean): string;
    hashBinary(data: string): string;
  }

  const SparkMD5: SparkMD5Static;
  export = SparkMD5;
}
