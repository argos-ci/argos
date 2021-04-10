/**
 * @param {any} maybeTrx
 * @returns {maybeTrx is import('objection').TransactionOrKnex & { executionPromise: Promise<any> }}
 */
export function checkIsTransaction(maybeTrx) {
  return Boolean(maybeTrx && maybeTrx.executionPromise)
}

/**
 * Wait for a transaction to be complete.
 * @param {import('objection').TransactionOrKnex} [trx]
 */
export async function waitForTransaction(trx) {
  return Promise.resolve(checkIsTransaction(trx) ? trx.executionPromise : null)
}

/**
 * Run a callback when the transaction is done.
 * @param {import('objection').TransactionOrKnex | undefined} trx
 * @param {Function} callback
 */
export function runAfterTransaction(trx, callback) {
  waitForTransaction(trx).then(
    () => {
      // If transaction success, then run action
      return Promise.resolve(callback()).catch((error) => {
        setTimeout(() => {
          throw error
        })
      })
    },
    () => {
      // Ignore transaction error
    },
  )
}

/** @type {import('knex') | null} */
let transactionKnexInstance = null

/**
 * @param {import('objection').TransactionOrKnex | undefined | ((trx: import('objection').TransactionOrKnex) => Promise.<any>)} trxOrCallback
 * @param {(trx: import('objection').TransactionOrKnex) => Promise.<any>} [maybeCallback]
 * @returns {Promise.<any>}
 */
export const transaction = (trxOrCallback, maybeCallback) => {
  if (!transactionKnexInstance) {
    throw new Error(`transaction is not initialized`)
  }

  if (maybeCallback === undefined) {
    if (typeof trxOrCallback !== 'function') {
      throw new Error(`Invalid transaction call`)
    }
    return transactionKnexInstance.transaction(trxOrCallback)
  }

  if (checkIsTransaction(trxOrCallback)) {
    return maybeCallback(trxOrCallback)
  }
  return transactionKnexInstance.transaction(maybeCallback)
}
/**
 *
 * @param {import('knex')} knexInstance
 */
transaction.knex = (knexInstance) => {
  transactionKnexInstance = knexInstance
}
