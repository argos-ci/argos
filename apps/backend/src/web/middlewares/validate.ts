import Ajv, { AnySchema, ValidateFunction } from "ajv";
// @ts-ignore
import { HttpError } from "express-err";

import { asyncHandler } from "../util.js";

/**
 * Returns a middleware with compiled ajv validators
 */
export const validate = (routeSchema: {
  body?: AnySchema;
  query?: AnySchema;
  params?: AnySchema;
}) => {
  const validators: {
    query?: ValidateFunction;
    params?: ValidateFunction;
    body?: ValidateFunction;
  } = {};
  const ajv = new Ajv();

  // Compiling query schema beforehand
  if (routeSchema.query) {
    const ajv = new Ajv();
    validators.query = ajv.compile(routeSchema.query);
  }

  // Compiling params schema beforehand
  if (routeSchema.params) {
    // We coerce types on params because they cann only be strings
    // since they are part of an url
    const ajv = new Ajv({ coerceTypes: true });
    validators.params = ajv.compile(routeSchema.params);
  }

  // Compiling body schema beforehand
  if (routeSchema.body) {
    const ajv = new Ajv();
    validators.body = ajv.compile(routeSchema.body);
  }

  // The actual middleware that gets loaded by express
  // has already-compiled validators
  return asyncHandler((req, _res, next) => {
    let validation = null;

    if (validators.params) {
      validation = validators.params(req.params);
      if (!validation) {
        throw new HttpError(
          400,
          `Request URL parameters validation failed: ${ajv.errorsText(
            validators.params.errors,
          )}`,
        );
      }
    }

    if (validators.query) {
      validation = validators.query(req.query);
      if (!validation) {
        throw new HttpError(
          400,
          `Request query validation failed: ${ajv.errorsText(
            validators.query.errors,
          )}`,
        );
      }
    }

    if (validators.body) {
      validation = validators.body(req.body);
      if (!validation) {
        throw new HttpError(
          400,
          `Request body validation failed: ${ajv.errorsText(
            validators.body.errors,
          )}`,
        );
      }
    }

    next();
  });
};
