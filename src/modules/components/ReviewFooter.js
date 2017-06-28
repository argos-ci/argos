import React from 'react'
import PropTypes from 'prop-types'
import Grid from 'material-ui/Grid'
import { withStyles, createStyleSheet } from 'material-ui/styles'
import configBrowser from 'configBrowser'
import Link from 'modules/components/Link'
import LayoutBody from 'modules/components/LayoutBody'

const styleSheet = createStyleSheet('ReviewFooter', theme => ({
  root: {
    color: theme.palette.text.secondary,
  },
}))

function ReviewFooter(props) {
  return (
    <footer className={props.classes.root}>
      <LayoutBody margin bottom>
        <Grid container justify="space-between">
          <Grid item>
            {`Argos ${configBrowser.get('heroku.releaseVersion')}`}
          </Grid>
          <Grid item>
            <Link href="https://github.com/argos-ci/argos">Contribute</Link>
          </Grid>
        </Grid>
      </LayoutBody>
    </footer>
  )
}

ReviewFooter.propTypes = {
  classes: PropTypes.object.isRequired,
}

export default withStyles(styleSheet)(ReviewFooter)
