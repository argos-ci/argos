/* eslint-disable no-console */

import chalk from 'chalk'

export function displayInfo(message) {
  if (process.env.NODE_ENV === 'test') {
    return
  }

  console.info(chalk.cyan(`i  ${message}`))
}

export function displayError(message) {
  if (process.env.NODE_ENV === 'test') {
    return
  }

  console.error(chalk.bold.red(`\n✘  ${message}`))
}

export function displaySuccess(message) {
  console.log(chalk.green(`\n✔  ${message}`))
}
