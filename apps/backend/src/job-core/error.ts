export const retryable = Symbol("retryable");

export class UnretryableError extends Error {
  [retryable] = false;
}

export const checkIsRetryable = (error: any): boolean => {
  return error[retryable] !== false;
};
