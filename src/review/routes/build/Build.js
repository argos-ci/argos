import React from 'react';
import Text from 'material-ui-build-next/src/Text';
import BuildSummary from 'review/routes/build/Summary';
import BuildScreenshots from 'review/routes/build/Screenshots';

function Build() {
  return (
    <div>
      <Text type="display1">
        argos-ci/argos
      </Text>
      <BuildSummary />
      <BuildScreenshots />
    </div>
  );
}

export default Build;
