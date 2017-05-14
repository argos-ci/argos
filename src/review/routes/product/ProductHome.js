import React from 'react'
import PropTypes from 'prop-types'
import { withStyles, createStyleSheet } from 'material-ui/styles'
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
          headline="Argos's visual regression system gives you high confidence in doing changes."
          beast={<Beast className={classes.beast} />}
        >
          <Button
            raised
            accent
            component={Link}
            href="/auth/github-public"
          >
            {'Try it'}
          </Button>
        </ProductHeader>
        <ProductShowcase
          title="Forget about regressions"
          size="large"
          textPosition="left"
          description={`
            Argos will warn you if any visual regressions is about to be introduced,
            so they those don't end-up in production.
            We are giving developers high confidence in doing changes so they can quickly iterate.
            You can review visual changes in one click as part of your code review process.
          `}
          image={
            <div />
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
          image={
            <GitHubStatus />
          }
        />
        <ProductShowcase
          title="Integrates in your development workflow"
          textPosition="left"
          description={`
            Argos integrates directly into your test suite and development workflow.
            We provide a command line interface streamlining the process.
          `}
          image={
            <div />
          }
        />
        <ProductShowcase
          title="Ship pixel-perfect interfaces"
          textPosition="right"
          description={`
            Argos provides different tools to compare screenshots.
            Designers can easily participate in the code review process.
          `}
          image={
            <div />
          }
        />
        <ProductShowcase
          title="Testing your open source project is 100% free"
          textPosition="left"
          description={`
Seriously. Always. We like to think of it as our way of giving
back to a community that gives us so much as well.
          `}
          image={
            <div />
          }
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

export default withStyles(styleSheet)(ProductHome)
