export const PUBLIC_SCOPES = ['user:email', 'repo:status', 'read:org']
export const PRIVATE_SCOPES = ['user:email', 'repo', 'read:org']

const EXPANDED_SCOPES = {
  repo: ['repo:status'],
}

export const expandScopes = scopes =>
  scopes.reduce(
    (expandedScopes, scope) => [...expandedScopes, scope, ...(EXPANDED_SCOPES[scope] || [])],
    []
  )
