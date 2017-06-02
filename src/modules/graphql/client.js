// Fetch polyfill
import 'whatwg-fetch'

const graphQLClient = {
  fetch: params =>
    fetch(`${window.location.origin}/graphql`, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'x-argos-release-version': window.clientData.config.heroku.releaseVersion,
      },
      credentials: 'same-origin',
      body: JSON.stringify(params),
    }).then(response => response.json()),
}

export default graphQLClient
