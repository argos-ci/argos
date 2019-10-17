import React from 'react'
import PropTypes from 'prop-types'
import Grid from 'material-ui/Grid'
import Typography from 'material-ui/Typography'
import { withStyles } from 'material-ui/styles'
import configBrowser from 'configBrowser'
import Link from 'modules/components/Link'
import LayoutBody from 'modules/components/LayoutBody'

const styles = theme => ({
  root: {
    color: theme.palette.text.secondary,
  },
})

function ReviewFooter(props) {
  return (
    <Typography component="footer" className={props.classes.root}>
      <LayoutBody margin marginBottom>
        <Grid container justify="space-between">
          <Grid item>{`Argos ${configBrowser.get('releaseVersion')}`}</Grid>
          <Grid item>
            <Link href="https://github.com/argos-ci/argos">Contribute</Link>
          </Grid>
        </Grid>
      </LayoutBody>
    </Typography>
  )
}

ReviewFooter.propTypes = {
  classes: PropTypes.object.isRequired,
}

export default withStyles(styles)(ReviewFooter)
