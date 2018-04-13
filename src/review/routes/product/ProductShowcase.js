import React from 'react'
import classNames from 'classnames'
import PropTypes from 'prop-types'
import { withStyles } from 'material-ui/styles'
import Typography from 'material-ui/Typography'
import Grid from 'material-ui/Grid'
import recompact from 'modules/recompact'
import LayoutBody from 'modules/components/LayoutBody'

const styles = theme => ({
  screen: {
    padding: `${theme.spacing.unit * 2}px 0`,
    [theme.breakpoints.up('md')]: {
      padding: `${theme.spacing.unit * 5}px 0`,
    },
  },
  description: {
    maxWidth: 650,
  },
  white: {
    background: '#fff',
  },
  image: {
    margin: 0,
    display: 'flex',
    justifyContent: 'center',
  },
})

function ProductShowcase(props) {
  const { classes, description, title, image, textPosition, size } = props

  return (
    <div
      className={classNames(classes.screen, {
        [classes.white]: textPosition === 'right',
      })}
    >
      <LayoutBody margin>
        <Grid container direction={textPosition === 'left' ? 'row' : 'row-reverse'} spacing={24}>
          <Grid item xs={12} md={image ? 5 : 12}>
            <Typography
              variant={size === 'large' ? 'display1' : 'title'}
              component="h3"
              gutterBottom
            >
              {title}
            </Typography>
            <Typography variant="subheading" component="p" className={classes.description}>
              {description}
            </Typography>
          </Grid>
          {image ? (
            <Grid item xs={12} md={7} component="figure" className={classes.image}>
              {image}
            </Grid>
          ) : null}
        </Grid>
      </LayoutBody>
    </div>
  )
}

ProductShowcase.propTypes = {
  classes: PropTypes.object.isRequired,
  description: PropTypes.string,
  image: PropTypes.node,
  size: PropTypes.oneOf(['normal', 'large']),
  textPosition: PropTypes.oneOf(['left', 'right']).isRequired,
  title: PropTypes.string,
}

ProductShowcase.defaultProps = {
  size: 'normal',
}

export default recompact.compose(recompact.pure, withStyles(styles))(ProductShowcase)
