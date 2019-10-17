import React from 'react'
import gql from 'graphql-tag'
import { useMutation } from '@apollo/react-hooks'
// eslint-disable-next-line import/no-cycle
import { BuildDetailFragment } from './BuildDetail'

export const RepositoryContextFragment = gql`
  fragment RepositoryContextFragment on Repository {
    id
    name
    token
    permissions
    baselineBranch
    archived
    active
    config
    owner {
      id
      name
      login
    }
    overviewBuild {
      ...BuildDetailFragment
    }
  }

  ${BuildDetailFragment}
`

const RepositoryContext = React.createContext()

export function RepositoryProvider({
  repository: initialRepository,
  children,
}) {
  const [repository, setRepository] = React.useState(initialRepository)
  const [updateRepository, { data: updateData }] = useMutation(gql`
    mutation UpdateRepository($repository: RepositoryUpdate!) {
      updateRepository(repository: $repository) {
        ...RepositoryContextFragment
      }
    }
    ${RepositoryContextFragment}
  `)
  React.useEffect(() => {
    if (updateData && updateData.updateRepository) {
      setRepository(updateData.updateRepository)
    }
  }, [updateData])
  const value = React.useMemo(
    () => ({
      repository,
      updateRepository,
    }),
    [repository, updateRepository],
  )
  return (
    <RepositoryContext.Provider value={value}>
      {children}
    </RepositoryContext.Provider>
  )
}

export function useRepository() {
  const { repository } = React.useContext(RepositoryContext)
  return repository
}

export function useUpdateRepository() {
  const { updateRepository } = React.useContext(RepositoryContext)
  return updateRepository
}
