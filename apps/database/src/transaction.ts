import type Knex from "knex";
import type { TransactionOrKnex } from "objection";

type TransactionOrKnexWithPromise = TransactionOrKnex & {
  executionPromise: Promise<any>;
};

export const checkIsTransaction = (
  maybeTrx: any
): maybeTrx is TransactionOrKnexWithPromise => {
  return Boolean(maybeTrx && maybeTrx.executionPromise);
};

/**
 * Wait for a transaction to be complete.
 */
export async function waitForTransaction(trx?: TransactionOrKnex) {
  return Promise.resolve(checkIsTransaction(trx) ? trx.executionPromise : null);
}

/**
 * Run a callback when the transaction is done.
 */
export function runAfterTransaction(
  trx: TransactionOrKnex | undefined,
  callback: () => void | Promise<void>
) {
  waitForTransaction(trx).then(
    () => {
      // If transaction success, then run action
      return Promise.resolve(callback()).catch((error) => {
        setTimeout(() => {
          throw error;
        });
      });
    },
    () => {
      // Ignore transaction error
    }
  );
}

let transactionKnexInstance: Knex | null = null;

/**
 * @template T
 * @param {import('objection').TransactionOrKnex | undefined | (trx: import('objection').TransactionOrKnex) => T} trxOrCallback
 * @param {(trx: import('objection').TransactionOrKnex) => T} [maybeCallback]
 * @returns {T}
 */
export const transaction = <TReturn>(
  trxOrCallback:
    | TransactionOrKnex
    | undefined
    | ((trx: TransactionOrKnex) => Promise<TReturn>),
  maybeCallback?: (trx: TransactionOrKnex) => Promise<TReturn>
): Promise<TReturn> => {
  if (!transactionKnexInstance) {
    throw new Error(`transaction is not initialized`);
  }

  if (maybeCallback === undefined) {
    if (typeof trxOrCallback !== "function") {
      throw new Error(`Invalid transaction call`);
    }
    return transactionKnexInstance.transaction(trxOrCallback);
  }

  if (checkIsTransaction(trxOrCallback)) {
    return maybeCallback(trxOrCallback);
  }
  return transactionKnexInstance.transaction(maybeCallback);
};

transaction.knex = (knexInstance: Knex) => {
  transactionKnexInstance = knexInstance;
};
