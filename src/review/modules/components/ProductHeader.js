import React from 'react'
import PropTypes from 'prop-types'
import { withStyles } from 'material-ui/styles'
import Typography from 'material-ui/Typography'
import Paper from 'material-ui/Paper'
import LayoutBody from 'modules/components/LayoutBody'

const styles = theme => ({
  root: {
    minHeight: 300,
    display: 'flex',
    alignItems: 'center',
    overflow: 'hidden',
  },
  wrapper: {
    position: 'relative',
  },
  text: {
    position: 'relative',
    zIndex: 1,
  },
  headline: {
    maxWidth: 500, // Don't use more space than the title.
    marginBottom: theme.spacing.unit * 3,
  },
})

function ProductHeader(props) {
  const { beast, classes, children, display1, headline } = props

  return (
    <Paper component="header" square elevation={0} className={classes.root}>
      <LayoutBody margin className={classes.wrapper}>
        <div className={classes.text}>
          <Typography variant="display1" component="h1" gutterBottom>
            {display1}
          </Typography>
          <Typography variant="headline" component="h2" className={classes.headline}>
            {headline}
          </Typography>
          {children}
        </div>
        {beast}
      </LayoutBody>
    </Paper>
  )
}

ProductHeader.propTypes = {
  beast: PropTypes.node,
  children: PropTypes.node,
  classes: PropTypes.object.isRequired,
  display1: PropTypes.node.isRequired,
  headline: PropTypes.node,
}

export default withStyles(styles)(ProductHeader)
