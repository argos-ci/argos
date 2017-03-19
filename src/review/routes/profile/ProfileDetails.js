import React, { PropTypes } from 'react'
import { connect } from 'react-redux'
import Text from 'material-ui/Text'
import Button from 'material-ui/Button'
import Link from 'modules/components/Link'
import ViewContainer from 'modules/components/ViewContainer'
import ScrollView from 'modules/components/ScrollView'
import LayoutBody from 'modules/components/LayoutBody'
import ReviewAppBar from 'review/modules/AppBar/AppBar'

function ProfileDetails({ user }) {
  return (
    <ViewContainer>
      <ReviewAppBar />
      <ScrollView>
        <LayoutBody margin>
          <Text type="display1" component="h2" gutterBottom>
            {user.name}
          </Text>
          {!user.privateSync && (
            <Button
              raised
              accent
              component={Link}
              href="/auth/github-private"
            >
              Synchronize private repositories
            </Button>
          )}
        </LayoutBody>
      </ScrollView>
    </ViewContainer>
  )
}

ProfileDetails.propTypes = {
  user: PropTypes.shape({
    name: PropTypes.string.isRequired,
    privateSync: PropTypes.bool.isRequired,
  }),
}

export default connect(state => state.data)(ProfileDetails)
