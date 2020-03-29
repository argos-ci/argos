import WebhooksApi from '@octokit/webhooks'
import config from '@argos-ci/config'
import { handleGitHubEvents } from '@argos-ci/synchronize'

const webhooks = new WebhooksApi({
  secret: config.get('github.webhookSecret'),
  path: '/github/event-handler',
})

webhooks.on('*', (...args) => {
  handleGitHubEvents(...args)
})

export default webhooks.middleware
