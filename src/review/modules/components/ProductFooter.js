import React from 'react'
import PropTypes from 'prop-types'
import { withStyles, createStyleSheet } from 'material-ui/styles'
import Typography from 'material-ui/Typography'
import Divider from 'material-ui/Divider'
import { fullWhite, darkWhite, lightWhite } from 'material-ui/styles/colors'
import LayoutBody from 'modules/components/LayoutBody'
import Link from 'modules/components/Link'
import GitHub from 'review/modules/components/GitHub'

const styleSheet = createStyleSheet('ProductFooter', theme => ({
  root: {
    background: theme.brandColor,
    color: darkWhite,
    overflow: 'auto',
  },
  title: {
    color: fullWhite,
  },
  divider: {
    margin: `${theme.spacing.unit * 2}px 0`,
    background: 'rgba(255, 255, 255, 0.2)',
  },
  copyright: {
    color: lightWhite,
  },
  list: {
    margin: 0,
    paddingLeft: 0,
    listStyle: 'none',
  },
  icon: {
    width: 16,
    height: 16,
    marginRight: theme.spacing.unit,
  },
}))

function ProductFooter(props) {
  const {
    classes,
  } = props

  return (
    <footer className={classes.root}>
      <LayoutBody margin>
        <Typography type="title" className={classes.title} gutterBottom>
          Quick Links
        </Typography>
        <Typography type="subheading" colorInherit component="div">
          <ul className={classes.list}>
            <li>
              <Link to="/about">
                About Us
              </Link>
            </li>
            <li>
              <Link to="/documentation">
                Documentation
              </Link>
            </li>
            <li>
              <Link to="/security">
                Security
              </Link>
            </li>
            <li>
              <Link to="/privacy">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link to="/terms">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link to="/support">
                Support
              </Link>
            </li>
          </ul>
          <Divider className={classes.divider} />
          <Link href="https://github.com/argos-ci/argos">
            <GitHub className={classes.icon} />
            {'GitHub'}
          </Link>
        </Typography>
        <Typography colorInherit className={classes.copyright}>
          {'Copyright © 2017 Argos'}
        </Typography>
      </LayoutBody>
    </footer>
  )
}

ProductFooter.propTypes = {
  classes: PropTypes.object.isRequired,
}

export default withStyles(styleSheet)(ProductFooter)
