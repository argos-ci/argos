import Octokit from '@octokit/rest'
import config from 'config'

const octokit = new Octokit({
  debug: config.get('env') === 'development',
  auth: {
    username: config.get('github.clientId'),
    password: config.get('github.clientSecret'),
  },
})

export default octokit
