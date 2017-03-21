import GitHubAPI from 'github'
import config from 'config'

const github = new GitHubAPI({ debug: config.get('env') === 'development' })

// Authenticate using clientId and clientSecret as describe in
// GitHub documentation to check access token validity.
github.authenticate({
  type: 'basic',
  username: config.get('github.clientId'),
  password: config.get('github.clientSecret'),
})

export default github
