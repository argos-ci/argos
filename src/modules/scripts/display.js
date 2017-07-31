/* eslint-disable no-console */

import chalk from 'chalk'

const display = {
  info: (...args) => {
    if (process.env.NODE_ENV === 'test') {
      return
    }

    console.info(chalk.cyan(`i  ${args.join(' ')}`))
  },
  error: (...args) => {
    if (process.env.NODE_ENV === 'test') {
      return
    }

    console.error(chalk.bold.red(`\n✘  ${args.join(' ')}`))
  },
  success: (...args) => {
    if (process.env.NODE_ENV === 'test') {
      return
    }

    console.log(chalk.green(`\n✔  ${args.join(' ')}`))
  },
}

export default display
