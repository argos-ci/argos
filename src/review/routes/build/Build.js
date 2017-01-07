import React from 'react';
import Text from 'material-ui-build-next/src/Text';
import Toolbar from 'material-ui-build-next/src/Toolbar';
import ViewContainer from 'modules/components/ViewContainer';
import LayoutAppBar from 'modules/components/LayoutAppBar';
import ScrollView from 'modules/components/ScrollView';
import LayoutBody from 'modules/components/LayoutBody';
import BuildSummary from 'review/routes/build/Summary';
import BuildScreenshots from 'review/routes/build/Screenshots';

function Build() {
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
        <LayoutBody margin>
          <Text type="display1" gutterBottom>
            argos-ci/argos
          </Text>
          <BuildSummary />
          <BuildScreenshots />
        </LayoutBody>
      </ScrollView>
    </ViewContainer>
  );
}

export default Build;
