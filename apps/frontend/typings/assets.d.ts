declare module "*.svg" {
  const url: string;
  export default url;
}

declare module "*.png" {
  const url: string;
  export default url;
}

/**
 * Vite's inline-worker import: the worker and everything it pulls in are bundled
 * into one file, base64'd into the importing chunk, and constructed from a blob
 * URL. Declared by hand because the project does not pull in `vite/client`.
 */
declare module "*?worker&inline" {
  const WorkerConstructor: new () => Worker;
  export default WorkerConstructor;
}
