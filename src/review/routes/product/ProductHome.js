import React from 'react'
import PropTypes from 'prop-types'
import { withStyles } from 'material-ui/styles'
import Button from 'material-ui/Button'
import ViewContainer from 'modules/components/ViewContainer'
import ScrollView from 'modules/components/ScrollView'
import Link from 'modules/components/Link'
import ReviewAppBar from 'review/modules/components/ReviewAppBar'
import ProductHeader from 'review/modules/components/ProductHeader'
import ProductFooter from 'review/modules/components/ProductFooter'
import ProductShowcase from 'review/routes/product/ProductShowcase'
import Beast from 'review/routes/repository/Beast'
import ProductTrust from 'review/routes/product/ProductTrust'
import GitHubStatus from 'review/routes/product/GitHubStatus'
import build from 'review/routes/product/build.png'
import ci from 'review/routes/product/ci.png'
import perfect from 'review/routes/product/perfect.png'

const styles = theme => ({
  beast: {
    padding: theme.spacing.unit * 3,
    position: 'absolute',
    bottom: '-60%',
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
  showcaseBuild: {
    border: '1px solid rgba(0, 0, 0, 0.1)',
    borderRadius: 4,
    maxHeight: 298.5, // 2x ratio
    [theme.breakpoints.up('sm')]: {
      maxHeight: 380,
    },
  },
  showcasePerfect: {
    [theme.breakpoints.down('sm')]: {
      // 2x ration
      width: 93,
      height: 93,
    },
  },
  showcaseCi: {
    [theme.breakpoints.down('sm')]: {
      // 2x ration
      width: 158,
      height: 158,
    },
  },
})

function ProductHome(props) {
  const { classes } = props

  return (
    <ViewContainer>
      <ReviewAppBar />
      <ScrollView>
        <ProductHeader
          display1="Automate visual regression testing"
          headline="Argos's visual regression system gives you high confidence in doing changes."
          beast={<Beast className={classes.beast} />}
        >
          <Button
            variant="raised"
            color="secondary"
            component={props => <Link {...props} variant="button" href="/auth/github-public" />}
          >
            {'Try it'}
          </Button>
        </ProductHeader>
        <ProductShowcase
          title="Forget about regressions"
          size="large"
          textPosition="left"
          description={`
            Argos will warn you if any visual regressions are about to be introduced,
            so they those don't end-up in production.
            We are giving developers high confidence in doing changes so they can quickly iterate.
            You can review visual changes in one click as part of your code review process.
          `}
          image={
            <Link href="https://www.argos-ci.com/callemall/material-ui/builds/3176">
              <img src={build} alt="build" className={classes.showcaseBuild} />
            </Link>
          }
        />
        <ProductShowcase
          title="Save time"
          textPosition="right"
          description={`
            Argos compares screenshots at high speed.
            You get a fast feedback.
            It comes with a GitHub integration.
            It will notify you on pull requests when something might be broken.
          `}
          image={<GitHubStatus />}
        />
        <ProductShowcase
          title="Integrates in your development workflow"
          textPosition="left"
          description={`
            Argos integrates directly into your test suite and development workflow.
            We provide a command line interface streamlining the process.
          `}
          image={<img src={ci} alt="ci" className={classes.showcaseCi} />}
        />
        <ProductShowcase
          title="Ship pixel-perfect interfaces"
          textPosition="right"
          description={`
            Argos provides different tools to compare screenshots.
            Designers can easily participate in the code review process.
          `}
          image={<img src={perfect} alt="perfect" className={classes.showcasePerfect} />}
        />
        <ProductShowcase
          title="Testing your open source project is 100% free"
          textPosition="left"
          description={`
            Seriously. Always. We like to think of it as our way of giving
            back to a community that gives us so much as well.
          `}
        />
        <ProductTrust />
        <ProductFooter />
      </ScrollView>
    </ViewContainer>
  )
}

ProductHome.propTypes = {
  classes: PropTypes.object.isRequired,
}

export default withStyles(styles)(ProductHome)
