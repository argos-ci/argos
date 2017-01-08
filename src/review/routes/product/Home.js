import React, { PropTypes } from 'react';
import { createStyleSheet } from 'jss-theme-reactor';
import withStyles from 'material-ui-build-next/src/styles/withStyles';
import Text from 'material-ui-build-next/src/Text';
import Paper from 'material-ui-build-next/src/Paper';
import Toolbar from 'material-ui-build-next/src/Toolbar';
import Divider from 'material-ui-build-next/src/Divider';
import ViewContainer from 'modules/components/ViewContainer';
import LayoutAppBar from 'modules/components/LayoutAppBar';
import ScrollView from 'modules/components/ScrollView';
import LayoutBody from 'modules/components/LayoutBody';
import ProductArgument from 'review/routes/product/Argument';

const styleSheet = createStyleSheet('ProductHome', () => ({
  landing: {
    overflow: 'auto',
    position: 'relative',
    paddingTop: 8 * 6,
    paddingBottom: 8 * 6,
  },
  headline: {
    maxWidth: 500, // Don't use more space than the title.
  },
}));

function ProductHome(props) {
  const {
    classes,
  } = props;

  return (
    <ViewContainer>
      <LayoutAppBar>
        <Toolbar>
          <Text type="title" colorInherit>
            {'Argos'}
          </Text>
        </Toolbar>
      </LayoutAppBar>
      <ScrollView>
        <Paper rounded={false} zDepth={3} className={classes.landing}>
          <LayoutBody margin bottom={false}>
            <Text type="display1" component="h1" gutterBottom>
              {'Stop discovering visual regressions'}
            </Text>
            <Text type="headline" component="h2" className={classes.headline}>
              {`
                Argos's visual regression system gives you high confidence in doing changes
              `}
            </Text>
          </LayoutBody>
        </Paper>
        <ProductArgument
          title={'Forget about regressions'}
          description={`
            Argos will warn you if any visual regressions are introduced.
            It comes with a Github integration.
            It will notify you on pull requests when something might be broken.
          `}
        />
        <ProductArgument
          title={'Save time'}
          description={`
            Argos compares screenshots at high speed.
            You get a fast feedback.
            You can review visual changes in one click as part of your code review process.
          `}
        />
        <ProductArgument
          title={'Integrates in your development workflow'}
          description={`
            Argos integrates directly into your test suite and development workflow.
            We provide a command line interface streamlining the process.
          `}
        />
        <ProductArgument
          title={'Ship pixel-perfect interfaces'}
          description={`
            Argos provides different tools to compare screenshots.
            Designers can easily participate in the code review process.
          `}
        />
        <Divider />
        <LayoutBody margin>
          <Text type="body1" align="center">
            {'Argos · '}
            <a href="https://github.com/argos-ci/argos">
              {'Github'}
            </a>
            {' · Copyright © 2017 Argos'}
          </Text>
        </LayoutBody>
      </ScrollView>
    </ViewContainer>
  );
}

ProductHome.propTypes = {
  classes: PropTypes.object,
};

export default withStyles(styleSheet)(ProductHome);
