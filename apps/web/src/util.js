/**
 * Takes a route handling function and returns
 * a function that wraps it in a `try/catch`. Caught
 * exceptions are forwarded to the `next` handler.
 */
export function asyncHandler(routeHandler) {
  return async (req, res, next) => {
    try {
      await routeHandler(req, res, next)
    } catch (err) {
      // Handle objection errors
      const candidates = [err.status, err.statusCode, err.code, 500]
      err.status = candidates.find(Number.isInteger)
      next(err)
    }
  }
}
