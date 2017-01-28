import React, { PropTypes } from 'react'
import { connect } from 'react-redux'
import Text from 'material-ui-build-next/src/Text'
import ViewContainer from 'modules/components/ViewContainer'
import ScrollView from 'modules/components/ScrollView'
import LayoutBody from 'modules/components/LayoutBody'
import ReviewAppBar from 'review/modules/AppBar/AppBar'

function ProfileDetails(props) {
  return (
    <ViewContainer>
      <ReviewAppBar />
      <ScrollView>
        <LayoutBody margin>
          <Text type="display1" component="h2" gutterBottom>
            {props.user.name}
          </Text>
        </LayoutBody>
      </ScrollView>
    </ViewContainer>
  )
}

ProfileDetails.propTypes = {
  user: PropTypes.shape({
    name: PropTypes.string.isRequired,
  }),
}

export default connect(state => state.data)(ProfileDetails)
