import Ajv from "ajv";
import { HttpError } from "express-err";

import { asyncHandler } from "../util";

/**
 * Returns a middleware with compiled ajv validators
 * @param {{ body?: object, query?: object, params?: object }} routeSchema
 */
export const validate = (routeSchema) => {
  const validators = {};
  const ajv = new Ajv();

  // Compiling query schema beforehand
  if (Object.prototype.hasOwnProperty.call(routeSchema, "query")) {
    const ajv = new Ajv();
    validators.query = ajv.compile(routeSchema.query);
  }

  // Compiling params schema beforehand
  if (Object.prototype.hasOwnProperty.call(routeSchema, "params")) {
    // We coerce types on params because they cann only be strings
    // since they are part of an url
    const ajv = new Ajv({ coerceTypes: true });
    validators.params = ajv.compile(routeSchema.params);
  }

  // Compiling body schema beforehand
  if (Object.prototype.hasOwnProperty.call(routeSchema, "body")) {
    const ajv = new Ajv();
    validators.body = ajv.compile(routeSchema.body);
  }

  // The actual middleware that gets loaded by express
  // has already-compiled validators
  return asyncHandler((req, _res, next) => {
    let validation = null;

    if (Object.prototype.hasOwnProperty.call(validators, "params")) {
      validation = validators.params(req.params);
      if (!validation) {
        throw new HttpError(
          400,
          `Request URL parameters validation failed: ${ajv.errorsText(
            validators.params.errors
          )}`
        );
      }
    }

    if (Object.prototype.hasOwnProperty.call(validators, "query")) {
      validation = validators.query(req.query);
      if (!validation) {
        throw new HttpError(
          400,
          `Request query validation failed: ${ajv.errorsText(
            validators.query.errors
          )}`
        );
      }
    }

    if (Object.prototype.hasOwnProperty.call(validators, "body")) {
      validation = validators.body(req.body);
      if (!validation) {
        throw new HttpError(
          400,
          `Request body validation failed: ${ajv.errorsText(
            validators.body.errors
          )}`
        );
      }
    }

    next();
  });
};
