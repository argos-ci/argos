// @flow weak

import React from 'react'
import classNames from 'classnames'
import PropTypes from 'prop-types'
import { withStyles, createStyleSheet } from 'material-ui/styles'
import Typography from 'material-ui/Typography'
import Grid from 'material-ui/Grid'
import recompact from 'modules/recompact'
import LayoutBody from 'modules/components/LayoutBody'

const styleSheet = createStyleSheet('ProductShowcase', () => ({
  screen: {
    paddingTop: 8 * 2,
    paddingBottom: 8 * 2,
  },
  description: {
    maxWidth: 650,
  },
  white: {
    background: '#fff',
  },
  image: {
    margin: 0,
    '& img': {
      width: '100%',
    },
  },
}))

function ProductShowcase(props) {
  const {
    classes,
    description,
    title,
    image,
    textPosition,
    size,
  } = props

  return (
    <div
      className={classNames(classes.screen, {
        [classes.white]: textPosition === 'right',
      })}
    >
      <LayoutBody margin bottom={false}>
        <Grid container direction={textPosition === 'left' ? 'row' : 'row-reverse'} gutter={24}>
          <Grid item xs={12} md={6}>
            <Typography type={size === 'large' ? 'display1' : 'title'} component="h3" gutterBottom>
              {title}
            </Typography>
            <Typography type="subheading" component="p" className={classes.description}>
              {description}
            </Typography>
          </Grid>
          <Grid
            item
            xs={12}
            md={6}
            component="figure"
            className={classes.image}
          >
            {image}
          </Grid>
        </Grid>
      </LayoutBody>
    </div>
  )
}

ProductShowcase.propTypes = {
  classes: PropTypes.object.isRequired,
  description: PropTypes.string,
  title: PropTypes.string,
  image: PropTypes.node,
  textPosition: PropTypes.oneOf(['left', 'right']).isRequired,
  size: PropTypes.oneOf(['normal', 'large']),
}

ProductShowcase.defaultProps = {
  size: 'normal',
}

export default recompact.compose(
  recompact.pure,
  withStyles(styleSheet),
)(ProductShowcase)
