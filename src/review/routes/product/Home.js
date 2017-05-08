import React from 'react'
import PropTypes from 'prop-types'
import { withStyles, createStyleSheet } from 'material-ui/styles'
import Typography from 'material-ui/Typography'
import Paper from 'material-ui/Paper'
import Grid from 'material-ui/Grid'
import Button from 'material-ui/Button'
import ViewContainer from 'modules/components/ViewContainer'
import ScrollView from 'modules/components/ScrollView'
import LayoutBody from 'modules/components/LayoutBody'
import Link from 'modules/components/Link'
import ReviewAppBar from 'review/modules/AppBar/AppBar'
import ProductArgument from 'review/routes/product/Argument'
import Beast from 'review/routes/repository/Beast'
import doctolib from 'review/routes/product/doctolib.svg'
import materialUI from 'review/routes/product/material-ui.svg'

const styleSheet = createStyleSheet('ProductHome', theme => ({
  landing: {
    minHeight: 300,
    display: 'flex',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  landingText: {
    zIndex: 1,
  },
  headline: {
    maxWidth: 500, // Don't use more space than the title.
    marginBottom: theme.spacing.unit * 3,
  },
  beast: {
    padding: theme.spacing.unit * 3,
    position: 'absolute',
    bottom: '-35%',
    height: '100%',
    right: 0,
    transform: 'rotate(180deg)',
    fill: theme.palette.background.default,
    transition: theme.transitions.create(['fill', 'transform']),
    zIndex: 0,
    [theme.breakpoints.up('md')]: {
      '&:hover': {
        transform: 'rotate(180deg) translateY(5%)',
        fill: theme.palette.primary[100],
      },
      zIndex: 3,
    },
  },
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
}))

function ProductHome(props) {
  const {
    classes,
  } = props

  return (
    <ViewContainer>
      <ReviewAppBar />
      <ScrollView>
        <Paper square elevation={0} className={classes.landing}>
          <LayoutBody margin bottom={false} className={classes.landingText}>
            <Typography type="display1" component="h1" gutterBottom>
              Automate visual regression testing
            </Typography>
            <Typography
              type="headline"
              component="h2"
              className={classes.headline}
            >
              {`
                Argos's visual regression system gives you high confidence in doing changes
              `}
            </Typography>
            <Button
              raised
              accent
              component={Link}
              href="/auth/github-public"
            >
              Try it
            </Button>
          </LayoutBody>
          <Beast className={classes.beast} />
        </Paper>
        <ProductArgument
          title="Forget about regressions"
          description={`
            Argos will warn you if any visual regressions is about to be introduced,
            so they those don't end-up in production.
            It comes with a Github integration.
            It will notify you on pull requests when something might be broken.
          `}
        />
        <ProductArgument
          title="Save time"
          description={`
            Argos compares screenshots at high speed.
            You get a fast feedback.
            You can review visual changes in one click as part of your code review process.
          `}
        />
        <ProductArgument
          title="Integrates in your development workflow"
          description={`
            Argos integrates directly into your test suite and development workflow.
            We provide a command line interface streamlining the process.
          `}
        />
        <ProductArgument
          title="Ship pixel-perfect interfaces"
          description={`
            Argos provides different tools to compare screenshots.
            Designers can easily participate in the code review process.
          `}
        />
        <Paper square elevation={0} className={classes.trusted}>
          <Grid container>
            <Grid
              item
              sm="3"
              container
              align="center"
              justify="center"
            >
              <Typography type="subheading" className={classes.trustedLogoLink}>
                {'Trusted by: '}
              </Typography>
            </Grid>
            <Grid
              item
              sm="3"
              container
              align="center"
              justify="center"
            >
              <a
                href="https://www.doctolib.com"
                target="_blank"
                rel="noopener noreferrer"
                className={classes.trustedLogoLink}
              >
                <img src={doctolib} alt="Doctolib" className={classes.trustedLogoImage} />
              </a>
            </Grid>
            <Grid
              item
              sm="3"
              container
              align="center"
              justify="center"
            >
              <a
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
              </a>
            </Grid>
            <Grid
              item
              sm="3"
              container
              align="center"
              justify="center"
            >
              <Typography type="title" className={classes.trustedLogoLink}>
                You?
              </Typography>
            </Grid>
          </Grid>
        </Paper>
        <LayoutBody margin>
          <Typography type="body1" align="center">
            {'Argos · '}
            <a href="https://github.com/argos-ci/argos">
              Github
            </a>
            {' · Copyright © 2017 Argos'}
          </Typography>
        </LayoutBody>
      </ScrollView>
    </ViewContainer>
  )
}

ProductHome.propTypes = {
  classes: PropTypes.object,
}

export default withStyles(styleSheet)(ProductHome)
