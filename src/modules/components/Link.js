import React from 'react'
import PropTypes from 'prop-types'
import classNames from 'classnames'
import { Link as LinkRouter } from 'react-router'
import { withStyles } from 'material-ui/styles'
import { capitalize } from 'material-ui/utils/helpers'

const styles = theme => ({
  root: {
    textDecoration: 'inherit',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
  variantDefault: {
    color: 'inherit',
  },
  variantPrimary: {
    color: theme.palette.primary[500],
  },
  variantButton: {
    '&:hover': {
      textDecoration: 'inherit',
    },
  },
})

function Link(props) {
  const { component: ComponentProp, classes, className, variant, to, ...other } = props

  let Component

  if (ComponentProp) {
    Component = ComponentProp
  } else if (to) {
    Component = LinkRouter
  } else {
    Component = 'a'
  }

  return (
    <Component
      to={to}
      className={classNames(classes.root, classes[`variant${capitalize(variant)}`], className)}
      {...other}
    />
  )
}

Link.propTypes = {
  classes: PropTypes.object.isRequired,
  className: PropTypes.string,
  component: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
  to: PropTypes.string,
  variant: PropTypes.oneOf(['primary', 'button', 'default']),
}

Link.defaultProps = {
  variant: 'default',
}

export default withStyles(styles)(Link)
