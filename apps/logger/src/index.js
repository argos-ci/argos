/* eslint-disable no-console */
const logger = {
  info: (...args) => {
    if (process.env.NODE_ENV === 'test') {
      return
    }

    console.info(...args)
  },
  error: (...args) => {
    if (process.env.NODE_ENV === 'test') {
      return
    }

    console.error(...args)
  },
  success: (...args) => {
    if (process.env.NODE_ENV === 'test') {
      return
    }

    console.log(...args)
  },
}

export default logger
