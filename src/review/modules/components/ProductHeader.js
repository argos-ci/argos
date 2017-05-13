import React from 'react'
import PropTypes from 'prop-types'
import { withStyles, createStyleSheet } from 'material-ui/styles'
import Typography from 'material-ui/Typography'
import Paper from 'material-ui/Paper'
import LayoutBody from 'modules/components/LayoutBody'

const styleSheet = createStyleSheet('ProductHeader', theme => ({
  root: {
    minHeight: 300,
    display: 'flex',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  text: {
    zIndex: 1,
  },
  headline: {
    maxWidth: 500, // Don't use more space than the title.
    marginBottom: theme.spacing.unit * 3,
  },
}))

function ProductHeader(props) {
  const {
    classes,
    display1,
    headline,
    children,
    beast,
  } = props

  return (
    <Paper
      component="header"
      square
      elevation={0}
      className={classes.root}
    >
      <LayoutBody margin bottom={false} className={classes.text}>
        <Typography type="display1" component="h1" gutterBottom>
          {display1}
        </Typography>
        <Typography
          type="headline"
          component="h2"
          className={classes.headline}
        >
          {headline}
        </Typography>
        {children}
      </LayoutBody>
      {beast}
    </Paper>
  )
}

ProductHeader.propTypes = {
  display1: PropTypes.node.isRequired,
  headline: PropTypes.node,
  children: PropTypes.node,
  beast: PropTypes.node,
  classes: PropTypes.object.isRequired,
}

export default withStyles(styleSheet)(ProductHeader)
