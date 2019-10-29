import React from 'react'
import gql from 'graphql-tag'
import { useMutation } from '@apollo/react-hooks'

export const BuildContextFragment = gql`
  fragment BuildContextFragment on Build {
    id
    createdAt
    number
    status
    repository {
      name
      owner {
        login
      }
    }
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
    screenshotDiffs {
      id
      createdAt
      updatedAt
      buildId
      baseScreenshotId
      baseScreenshot {
        name
        s3Id
      }
      compareScreenshotId
      compareScreenshot {
        name
        s3Id
      }
      score
      s3Id
      jobStatus
      validationStatus
    }
  }
`

const BuildContext = React.createContext()

export function BuildProvider({ build: initialBuild, children }) {
  const [build, setBuild] = React.useState(initialBuild)
  const [
    setValidationStatus,
    { loading: queryLoading, error: queryError, data },
  ] = useMutation(gql`
    mutation setValidationStatus(
      $buildId: ID!
      $validationStatus: ValidationStatus!
    ) {
      setValidationStatus(
        buildId: $buildId
        validationStatus: $validationStatus
      )
    }
  `)
  React.useEffect(() => {
    if (data && data.setValidationStatus) {
      setBuild({ ...build, validationStatus: data.setValidationStatus })
    }
  }, [build, data, queryError, queryLoading])
  const value = React.useMemo(
    () => ({
      build,
      setValidationStatus,
      queryLoading,
      queryError,
    }),
    [build, queryError, queryLoading, setValidationStatus],
  )
  return <BuildContext.Provider value={value}>{children}</BuildContext.Provider>
}

export function useBuild() {
  const { build } = React.useContext(BuildContext)
  return build
}

export function useValidationStatusBuild() {
  const {
    setValidationStatus,
    queryLoading: loading,
    queryError: error,
  } = React.useContext(BuildContext)
  return { setValidationStatus, loading, error }
}
