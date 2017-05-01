// @flow weak

import React from 'react'
import PropTypes from 'prop-types'
import { withStyles, createStyleSheet } from 'material-ui/styles'
import Typography from 'material-ui/Typography'
import recompact from 'modules/recompact'
import LayoutBody from 'modules/components/LayoutBody'

const styleSheet = createStyleSheet('ProductArgument', () => ({
  screen: {
    paddingTop: 8 * 2,
    paddingBottom: 8 * 2,
  },
  description: {
    maxWidth: 650,
  },
}))

function ProductArgument(props) {
  const {
    classes,
    description,
    title,
  } = props

  return (
    <div className={classes.screen}>
      <LayoutBody margin bottom={false}>
        <Typography type="title" component="h3" gutterBottom>
          {title}
        </Typography>
        <Typography type="subheading" component="p" className={classes.description}>
          {description}
        </Typography>
      </LayoutBody>
    </div>
  )
}

ProductArgument.propTypes = {
  classes: PropTypes.object.isRequired,
  description: PropTypes.string,
  title: PropTypes.string,
}

export default recompact.compose(
  recompact.pure,
  withStyles(styleSheet),
)(ProductArgument)
