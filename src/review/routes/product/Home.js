import React from 'react'
import PropTypes from 'prop-types'
import { withStyles, createStyleSheet } from 'material-ui/styles'
import Typography from 'material-ui/Typography'
import Paper from 'material-ui/Paper'
import Grid from 'material-ui/Grid'
import Button from 'material-ui/Button'
import ViewContainer from 'modules/components/ViewContainer'
import ScrollView from 'modules/components/ScrollView'
import Link from 'modules/components/Link'
import ReviewAppBar from 'review/modules/components/AppBar'
import ProductHeader from 'review/modules/components/ProductHeader'
import ProductFooter from 'review/modules/components/ProductFooter'
import ProductArgument from 'review/routes/product/Argument'
import Beast from 'review/routes/repository/Beast'
import doctolib from 'review/routes/product/doctolib.svg'
import materialUI from 'review/routes/product/material-ui.svg'

const styleSheet = createStyleSheet('ProductHome', theme => ({
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
        <ProductHeader
          display1="Automate visual regression testing"
          headline="Argos's visual regression system gives you high confidence in doing changes"
        >
          <Button
            raised
            accent
            component={Link}
            href="/auth/github-public"
          >
            {'Try it'}
          </Button>
          <Beast className={classes.beast} />
        </ProductHeader>
        <ProductArgument
          title="Forget about regressions"
          description={`
            Argos will warn you if any visual regressions is about to be introduced,
            so they those don't end-up in production.
            It comes with a GitHub integration.
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
                href="https://github.com/doctolib"
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
        <ProductFooter />
      </ScrollView>
    </ViewContainer>
  )
}

ProductHome.propTypes = {
  classes: PropTypes.object.isRequired,
}

export default withStyles(styleSheet)(ProductHome)
