// Taken from convict source code.
function walk(obj, path, initializeMissing = false) {
  let newObj = obj

  if (path) {
    const ar = path.split('.')
    while (ar.length) {
      const k = ar.shift()
      if (initializeMissing && obj[k] == null) {
        newObj[k] = {}
        newObj = newObj[k]
      } else if (k in newObj) {
        newObj = newObj[k]
      } else {
        throw new Error(`cannot find configuration param '${path}'`)
      }
    }
  }

  return newObj
}

export default {
  get: key => (global.clientData ? walk(global.clientData.config, key) : null),
}
