import React from 'react'
import PropTypes from 'prop-types'
import { withStyles } from 'material-ui/styles'
import Typography from 'material-ui/Typography'
import Paper from 'material-ui/Paper'
import Grid from 'material-ui/Grid'
import Link from 'modules/components/Link'
import doctolib from 'review/routes/product/doctolib.svg'
import materialUI from 'review/routes/product/material-ui.svg'

const styles = theme => ({
  trusted: {
    display: 'flex',
  },
  trustedLogoLink: {
    display: 'block',
    padding: theme.spacing.unit * 2,
  },
  trustedLogoImage: {
    maxHeight: 80,
    width: '100%',
  },
})

function ProductTrust(props) {
  const { classes } = props

  return (
    <Paper square elevation={0} className={classes.trusted}>
      <Grid container>
        <Grid item sm={3} container alignItems="center" justify="center">
          <Typography variant="subheading" className={classes.trustedLogoLink}>
            {'Trusted by: '}
          </Typography>
        </Grid>
        <Grid item sm={3} container alignItems="center" justify="center">
          <Link
            href="https://github.com/doctolib"
            target="_blank"
            rel="noopener noreferrer"
            className={classes.trustedLogoLink}
          >
            <img src={doctolib} alt="Doctolib" className={classes.trustedLogoImage} />
          </Link>
        </Grid>
        <Grid item sm={3} container alignItems="center" justify="center">
          <Link
            href="https://github.com/callemall/material-ui"
            target="_blank"
            rel="noopener noreferrer"
            className={classes.trustedLogoLink}
          >
            <img
              src={materialUI}
              alt="Material-UI"
              title="Material-UI"
              className={classes.trustedLogoImage}
            />
          </Link>
        </Grid>
        <Grid item sm={3} container alignItems="center" justify="center">
          <Typography variant="title" className={classes.trustedLogoLink}>
            You?
          </Typography>
        </Grid>
      </Grid>
    </Paper>
  )
}

ProductTrust.propTypes = {
  classes: PropTypes.object.isRequired,
}

export default withStyles(styles)(ProductTrust)
