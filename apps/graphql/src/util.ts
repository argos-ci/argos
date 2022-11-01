export class APIError extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "APIError";
    Error.captureStackTrace(this, APIError);
  }
}
