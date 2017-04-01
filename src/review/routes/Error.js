import React, { PropTypes } from 'react'
import { compose } from 'recompact'
import { connect } from 'react-redux'
import { withStyles, createStyleSheet } from 'material-ui/styles'
import LayoutBody from 'modules/components/LayoutBody'
import ViewContainer from 'modules/components/ViewContainer'
import ScrollView from 'modules/components/ScrollView'
import ReviewAppBar from 'review/modules/AppBar/AppBar'

const styleSheet = createStyleSheet('Error', () => ({
  statusCode: {
    fontSize: 30,
    lineHeight: 2,
  },
}))

function ErrorView({ classes, error }) {
  return (
    <ViewContainer>
      <ReviewAppBar />
      <ScrollView>
        <LayoutBody margin bottom={false}>
          { <div className={classes.statusCode}>Error {error.statusCode}</div> }
          { error.message && <div>{error.message}</div> }
          { error.stack && <code><pre>{error.stack}</pre></code> }
        </LayoutBody>
      </ScrollView>
    </ViewContainer>
  )
}

ErrorView.propTypes = {
  classes: PropTypes.object,
  error: PropTypes.shape({
    message: PropTypes.string,
    stack: PropTypes.string,
    statusCode: PropTypes.number.isRequired,
  }),
}

export default compose(
  withStyles(styleSheet),
  connect(state => ({ error: state.data.error })),
)(ErrorView)
