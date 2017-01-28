import React, { PropTypes } from 'react'
import { Link as LinkRouter } from 'react-router'
import Link from 'modules/components/Link'

function RepositoryDetails(props) {
  const {
    profileId,
    repositoryId,
  } = props.params

  return (
    <div>
      <Link component={LinkRouter} to={`/${profileId}/${repositoryId}/builds/1`}>
        {'build 1'}
      </Link>
      <br />
      <Link component={LinkRouter} to={`/${profileId}/${repositoryId}/settings`}>
        {'Settings'}
      </Link>
    </div>
  )
}

RepositoryDetails.propTypes = {
  params: PropTypes.shape({
    profileId: PropTypes.string.isRequired,
    repositoryId: PropTypes.string.isRequired,
  }).isRequired,
}

export default RepositoryDetails
