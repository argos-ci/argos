import React, { PropTypes } from 'react'
import { Link as LinkRouter } from 'react-router'
import Text from 'material-ui/Text'
import ViewContainer from 'modules/components/ViewContainer'
import Link from 'modules/components/Link'
import ScrollView from 'modules/components/ScrollView'
import LayoutBody from 'modules/components/LayoutBody'
import ReviewAppBar from 'review/modules/AppBar/AppBar'

function Profile(props) {
  const {
    profileName,
  } = props.params

  return (
    <ViewContainer>
      <ReviewAppBar />
      <ScrollView>
        <LayoutBody margin>
          <Text type="display1" component="h2" gutterBottom>
            <Link component={LinkRouter} to={`/${profileName}`}>
              {profileName}
            </Link>
          </Text>
          <ul>
            <li>
              <Text>
                <Link component={LinkRouter} to={`/${profileName}/material-ui`}>
                  {'material-ui'}
                </Link>
              </Text>
            </li>
          </ul>
        </LayoutBody>
      </ScrollView>
    </ViewContainer>
  )
}

Profile.propTypes = {
  params: PropTypes.shape({
    profileName: PropTypes.string.isRequired,
  }).isRequired,
}

export default Profile
