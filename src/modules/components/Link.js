import React, { PropTypes } from 'react'
import { createStyleSheet } from 'jss-theme-reactor'
import withStyles from 'material-ui-build-next/src/styles/withStyles'

const styleSheet = createStyleSheet('Link', () => ({
  root: {
    color: 'inherit',
    textDecoration: 'inherit',
    '&:hover': {
      borderBottom: '1px solid currentColor',
    },
  },
}))

function Link(props) {
  const {
    component: ComponentProp,
    classes,
    ...other
  } = props

  return <ComponentProp className={classes.root} {...other} />
}

Link.propTypes = {
  classes: PropTypes.object.isRequired,
  component: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
}

Link.defaultProps = {
  component: 'a',
}

export default withStyles(styleSheet)(Link)
