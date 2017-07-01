/* eslint-disable no-underscore-dangle */

import { ApolloClient, createNetworkInterface } from 'react-apollo'
import fetch from 'isomorphic-fetch'
import configBrowser from 'configBrowser'

// Polyfill fetch() on the server for apollo-client
if (!process.browser) {
  global.fetch = fetch
}

function create({ headers = {} } = {}) {
  return new ApolloClient({
    ssrMode: !process.browser, // Disables forceFetch on the server (so queries are only run once)
    networkInterface: createNetworkInterface({
      uri: `${window.location.origin}/graphql`,
      opts: {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-sandbot-release': configBrowser.get('releaseVersion'),
          ...headers,
        },
      },
    }),
  })
}

export default function initApollo(options) {
  // Make sure to create a new client for every server-side request so that data
  // isn't shared between connections (which would be bad)
  if (!process.browser) {
    return create(options)
  }

  // Reuse client on the client-side
  if (!global.__INIT_APOLLO_CLIENT__) {
    global.__INIT_APOLLO_CLIENT__ = create(options)
  }

  return global.__INIT_APOLLO_CLIENT__
}
