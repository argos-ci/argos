import React from 'react'
import PropTypes from 'prop-types'
import { withStyles } from 'material-ui/styles'
import Typography from 'material-ui/Typography'
import Divider from 'material-ui/Divider'
import Grid from 'material-ui/Grid'
import LayoutBody from 'modules/components/LayoutBody'
import Link from 'modules/components/Link'
import GitHub from 'modules/components/GitHub'

const styles = theme => ({
  root: {
    background: theme.brandColor,
    color: 'rgba(255, 255, 255, 0.87)',
    overflow: 'auto',
  },
  title: {
    color: theme.palette.common.white,
  },
  divider: {
    margin: `${theme.spacing.unit * 2}px 0`,
    background: 'rgba(255, 255, 255, 0.2)',
  },
  copyright: {
    color: 'rgba(255, 255, 255, 0.54)',
  },
  list: {
    margin: 0,
    paddingLeft: 0,
    listStyle: 'none',
  },
  listItem: {
    paddingTop: theme.spacing.unit / 2,
    paddingBottom: theme.spacing.unit / 2,
  },
  icon: {
    width: 16,
    height: 16,
    marginRight: theme.spacing.unit,
  },
})

function ProductFooter(props) {
  const { classes } = props

  return (
    <footer className={classes.root}>
      <LayoutBody margin marginBottom>
        <Typography variant="title" className={classes.title} gutterBottom>
          Quick Links
        </Typography>
        <Typography variant="subheading" color="inherit" component="div">
          <Grid container spacing={0}>
            <Grid item xs={12} sm={6}>
              <ul className={classes.list}>
                <li className={classes.listItem}>
                  <Link to="/about">About Us</Link>
                </li>
                <li className={classes.listItem}>
                  <Link to="/documentation">Documentation</Link>
                </li>
                <li className={classes.listItem}>
                  <Link to="/security">Security</Link>
                </li>
              </ul>
            </Grid>
            <Grid item xs={12} sm={6}>
              <ul className={classes.list}>
                <li className={classes.listItem}>
                  <Link to="/privacy">Privacy Policy</Link>
                </li>
                <li className={classes.listItem}>
                  <Link to="/terms">Terms of Service</Link>
                </li>
                <li className={classes.listItem}>
                  <Link to="/support">Support</Link>
                </li>
              </ul>
            </Grid>
          </Grid>
        </Typography>
        <Divider className={classes.divider} />
        <Typography variant="subheading" color="inherit" component="div">
          <Link href="https://github.com/argos-ci">
            <GitHub className={classes.icon} />
            {'GitHub'}
          </Link>
        </Typography>
        <Typography color="inherit" className={classes.copyright}>
          {'Copyright © 2017 Argos'}
        </Typography>
      </LayoutBody>
    </footer>
  )
}

ProductFooter.propTypes = {
  classes: PropTypes.object.isRequired,
}

export default withStyles(styles)(ProductFooter)
