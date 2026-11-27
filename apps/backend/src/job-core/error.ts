import { retryableSymbol } from "@/util/error";

export class UnretryableError extends Error {
  [retryableSymbol] = false;
}
