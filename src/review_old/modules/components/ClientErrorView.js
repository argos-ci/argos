import React from 'react'
import PropTypes from 'prop-types'
import Typography from 'material-ui/Typography'
import LayoutBody from 'modules/components/LayoutBody'
import ViewContainer from 'modules/components/ViewContainer'
import ScrollView from 'modules/components/ScrollView'
import ReviewAppBar from 'review/modules/components/ReviewAppBar'

function ClientErrorView(props) {
  return (
    <ViewContainer>
      <ReviewAppBar />
      <ScrollView>
        <LayoutBody margin marginBottom>
          <Typography variant="display1" component="h2" gutterBottom>
            {props.title}
          </Typography>
          <Typography variant="subheading">{props.message}</Typography>
        </LayoutBody>
      </ScrollView>
    </ViewContainer>
  )
}

ClientErrorView.propTypes = {
  message: PropTypes.node.isRequired,
  title: PropTypes.node.isRequired,
}

export default ClientErrorView
