import React, { PropTypes } from 'react';
import { createStyleSheet } from 'jss-theme-reactor';
import withStyles from 'material-ui-build-next/src/styles/withStyles';
import Text from 'material-ui-build-next/src/Text';
import Paper from 'material-ui-build-next/src/Paper';
import Toolbar from 'material-ui-build-next/src/Toolbar';
import ViewContainer from 'modules/components/ViewContainer';
import LayoutAppBar from 'modules/components/LayoutAppBar';
import ScrollView from 'modules/components/ScrollView';
import LayoutBody from 'modules/components/LayoutBody';

const styleSheet = createStyleSheet('ProductHome', () => ({
  landing: {
    padding: 25,
  },
}));

function ProductHome(props) {
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
        <LayoutBody fullWidth>
          <Paper rounded={false} className={props.classes.landing}>
            <Text type="display1" component="h1">
              {'Stop discovering visual regression'}
            </Text>
            <Text type="headline" component="h2">
              {"Argos's visual regression system gives you high confidence editing your style."}
            </Text>
          </Paper>
        </LayoutBody>
      </ScrollView>
    </ViewContainer>
  );
}

ProductHome.propTypes = {
  classes: PropTypes.object,
};

export default withStyles(styleSheet)(ProductHome);
