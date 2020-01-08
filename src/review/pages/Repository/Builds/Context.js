import React from 'react'
import gql from 'graphql-tag'
import { useQuery } from '@apollo/react-hooks'

const LIST_QUERY = gql`
  query RepositoryBuilds($ownerLogin: String!, $name: String!, $after: Int!) {
    repository(ownerLogin: $ownerLogin, repositoryName: $name) {
      id
      builds(first: 5, after: $after) {
        pageInfo {
          totalCount
          hasNextPage
          endCursor
        }
        edges {
          id
          createdAt
          number
          status
          baseScreenshotBucket {
            id
            createdAt
            updatedAt
            name
            commit
            branch
          }
          compareScreenshotBucket {
            id
            createdAt
            updatedAt
            name
            commit
            branch
          }
        }
      }
    }
  }
`

const ListContext = React.createContext()

export function ListProvider({ repository, children }) {
  const [builds, setBuilds] = React.useState([])
  const [pageInfo, setPageInfo] = React.useState()
  const [load, setLoad] = React.useState(true)
  const [cursor, setCursor] = React.useState(0)

  const loadMore = cursor => {
    setCursor(cursor)
    setLoad(true)
  }

  const { loading: queryLoading, error: queryError, data } = useQuery(
    LIST_QUERY,
    {
      variables: {
        ownerLogin: repository.owner.login,
        name: repository.name,
        after: cursor,
      },
    },
  )

  React.useEffect(() => {
    if (data && !queryError) {
      const {
        repository: { builds: queryBuilds },
      } = data

      if (
        queryBuilds &&
        queryBuilds.pageInfo &&
        queryBuilds.pageInfo.totalCount > 0 &&
        load
      ) {
        // not already in the list
        const buildIds = builds.map(build => build.id)
        const buildsToAdd = queryBuilds.edges.filter(
          build => buildIds.indexOf(build.id) === -1,
        )

        if (buildsToAdd.length > 0) {
          setBuilds([...builds, ...queryBuilds.edges])
          setPageInfo(queryBuilds.pageInfo)
          setLoad(false)
        }
      }
    }
  }, [builds, cursor, data, load, queryError])

  const value = React.useMemo(
    () => ({
      builds,
      cursor,
      queryLoading,
      queryError,
      loadMore,
      pageInfo,
    }),
    [builds, cursor, pageInfo, queryError, queryLoading],
  )
  return <ListContext.Provider value={value}>{children}</ListContext.Provider>
}

export function useBuilds() {
  const {
    builds,
    pageInfo,
    queryLoading: loading,
    queryError: error,
  } = React.useContext(ListContext)
  return { builds, pageInfo, loading, error }
}

export function useLoadMore() {
  const { loadMore } = React.useContext(ListContext)
  return loadMore
}
