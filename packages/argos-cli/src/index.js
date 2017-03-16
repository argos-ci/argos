/* eslint-disable no-console */
import program from 'commander'
import chalk from 'chalk'
import setupRaven from './setupRaven'
import pkg from '../package.json'
import upload, { UploadError } from './upload'

setupRaven()

program
  .version(pkg.version)
  .command('upload <directory>')
  .description('Upload screenshots')
  .option('-T, --token <token>', 'Repository token')
  .action((directory, command) => {
    if (!command.token) {
      console.log(chalk.bold.red('argos-ci: You must provide a repository token using --token.'))
      return
    }

    upload(directory, command.token)
      .then(res => res.json())
      .then((res) => {
        if (res.error) {
          throw new UploadError(res.error.message)
        }

        console.log(chalk.green(`argos-ci: Build created (id: ${res.id}).`))
      })
      .catch((err) => {
        console.error(chalk.bold.red('argos-ci: Sorry an error happened:\n'))

        if (err instanceof UploadError) {
          console.error(chalk.bold.red(err.message))
        } else {
          console.error(chalk.bold.red(err.message))
          console.error(chalk.bold.red(err.stack))
        }
        process.exit(1)
      })
  })

if (!process.argv.slice(2).length) {
  program.outputHelp()
} else {
  program.parse(process.argv)
}
