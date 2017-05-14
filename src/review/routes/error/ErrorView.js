import React from 'react'
import PropTypes from 'prop-types'
import Typography from 'material-ui/Typography'
import LayoutBody from 'modules/components/LayoutBody'
import ViewContainer from 'modules/components/ViewContainer'
import ScrollView from 'modules/components/ScrollView'
import ReviewAppBar from 'review/modules/components/ReviewAppBar'

function ErrorView(props) {
  return (
    <ViewContainer>
      <ReviewAppBar />
      <ScrollView>
        <LayoutBody margin>
          <Typography type="display1" component="h2" gutterBottom>
            {props.title}
          </Typography>
          <Typography type="subheading">
            {props.message}
          </Typography>
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
