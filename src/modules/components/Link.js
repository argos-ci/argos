import React, { PropTypes } from 'react'
import classNames from 'classnames'
import { createStyleSheet } from 'jss-theme-reactor'
import withStyles from 'material-ui-build-next/src/styles/withStyles'

const styleSheet = createStyleSheet('Link', () => ({
  root: {
    color: 'inherit',
    textDecoration: 'inherit',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
}))

function Link(props) {
  const {
    component: ComponentProp,
    classes,
    className,
    ...other
  } = props

  return <ComponentProp className={classNames(classes.root, className)} {...other} />
}

Link.propTypes = {
  classes: PropTypes.object.isRequired,
  className: PropTypes.string,
  component: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
}

Link.defaultProps = {
  component: 'a',
}

export default withStyles(styleSheet)(Link)
