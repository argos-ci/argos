import 'isomorphic-fetch'
import configBrowser from 'configBrowser'

const graphQLClient = {
  fetch: params =>
    fetch(`${window.location.origin}/graphql`, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'x-argos-release-version': configBrowser.get('releaseVersion'),
      },
      credentials: 'same-origin',
      body: JSON.stringify(params),
    }).then(response => response.json()),
}

export default graphQLClient
