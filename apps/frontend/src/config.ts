// Taken from convict source code.
function walk(obj: any, path: string, initializeMissing = false) {
  let newObj = obj;

  if (path) {
    const ar = path.split(".");
    while (ar.length) {
      const k = ar.shift();
      if (!k) continue;
      if (initializeMissing && obj[k] == null) {
        newObj[k] = {};
        newObj = newObj[k];
      } else if (k in newObj) {
        newObj = newObj[k];
      } else {
        throw new Error(`cannot find configuration param '${path}'`);
      }
    }
  }

  return newObj;
}

export default {
  get: (key: string): any =>
    (window as any).clientData
      ? walk((window as any).clientData.config, key)
      : null,
};
