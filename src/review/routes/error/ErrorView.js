import React from 'react'
import PropTypes from 'prop-types'
import Text from 'material-ui/Text'
import LayoutBody from 'modules/components/LayoutBody'
import ViewContainer from 'modules/components/ViewContainer'
import ScrollView from 'modules/components/ScrollView'
import ReviewAppBar from 'review/modules/AppBar/AppBar'

function ErrorView(props) {
  return (
    <ViewContainer>
      <ReviewAppBar />
      <ScrollView>
        <LayoutBody margin>
          <Text type="display1" component="h2" gutterBottom>
            {props.title}
          </Text>
          <Text type="subheading">
            {props.message}
          </Text>
        </LayoutBody>
      </ScrollView>
    </ViewContainer>
  )
}

ErrorView.propTypes = {
  title: PropTypes.node.isRequired,
  message: PropTypes.node.isRequired,
}

export default ErrorView
