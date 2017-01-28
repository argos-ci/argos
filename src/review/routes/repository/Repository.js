import React, { PropTypes } from 'react'
import { Link as LinkRouter } from 'react-router'
import Text from 'material-ui-build-next/src/Text'
import ViewContainer from 'modules/components/ViewContainer'
import Link from 'modules/components/Link'
import ScrollView from 'modules/components/ScrollView'
import LayoutBody from 'modules/components/LayoutBody'
import ReviewAppBar from 'review/modules/AppBar/AppBar'

function Repository(props) {
  const {
    params: {
      profileId,
      repositoryId,
    },
    children,
  } = props

  return (
    <ViewContainer>
      <ReviewAppBar />
      <ScrollView>
        <LayoutBody margin>
          <Text type="display1" component="h2" gutterBottom>
            <Link component={LinkRouter} to={`/${profileId}`}>
              {profileId}
            </Link>
            {'/'}
            <Link component={LinkRouter} to={`/${profileId}/${repositoryId}`}>
              {repositoryId}
            </Link>
          </Text>
          {children}
        </LayoutBody>
      </ScrollView>
    </ViewContainer>
  )
}

Repository.propTypes = {
  children: PropTypes.element.isRequired,
  params: PropTypes.shape({
    profileId: PropTypes.string.isRequired,
    repositoryId: PropTypes.string.isRequired,
  }).isRequired,
}

export default Repository
