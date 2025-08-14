export function createResolvablePromise() {
  let resolve: (value: any) => void;
  const promise = new Promise((r) => {
    resolve = r;
  }) as Promise<any> & { resolve: (value: any) => void };
  promise.resolve = resolve!;
  return promise;
}
