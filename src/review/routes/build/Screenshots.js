import React, { PropTypes } from 'react';
import { connect } from 'react-redux';
import { createStyleSheet } from 'jss-theme-reactor';
import withStyles from 'material-ui-build-next/src/styles/withStyles';
import Text from 'material-ui-build-next/src/Text';
import Paper from 'material-ui-build-next/src/Paper';
import recompose from 'modules/recompose';
import WatchTask from 'modules/components/WatchTask';

const styleSheet = createStyleSheet('BuildScreenshots', () => {
  return {
    paper: {
      overflow: 'auto',
      marginBottom: 8 * 2,
    },
  };
});

function BuildScreenshots(props) {
  return (
    <div>
      <Text type="headline" gutterBottom>
        {'Screenshots'}
      </Text>
      <WatchTask task={props.fetch}>
        {() => {
          const {
            screenshotDiffs,
          } = props.fetch.output.data;

          return (
            <ul>
              {screenshotDiffs.map((screenshotDiff) => {
                const {
                  id,
                  baseScreenshot,
                  compareScreenshot,
                } = screenshotDiff;

                return (
                  <li key={id}>
                    <Paper className={props.classes.paper}>
                      <img
                        alt={baseScreenshot.name}
                        src={baseScreenshot.s3Id}
                      />
                      <img
                        alt={compareScreenshot.name}
                        src={compareScreenshot.s3Id}
                      />
                    </Paper>
                  </li>
                );
              })}
            </ul>
          );
        }}
      </WatchTask>
    </div>
  );
}

BuildScreenshots.propTypes = {
  classes: PropTypes.object.isRequired,
  fetch: PropTypes.object.isRequired,
};

export default recompose.compose(
  withStyles(styleSheet),
  connect(state => ({
    fetch: state.build.fetch,
  })),
)(BuildScreenshots);
