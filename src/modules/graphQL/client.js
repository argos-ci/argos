// Fetch polyfill
import 'whatwg-fetch'

const graphQLClient = {
  fetch: (params) => {
    return fetch(`${window.location.origin}/graphql`, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'X-Argos-Release': window.clientData.releaseVersion,
      },
      credentials: 'same-origin',
      body: JSON.stringify(params),
    })
    .then(response => response.json())
  },
}

export default graphQLClient
