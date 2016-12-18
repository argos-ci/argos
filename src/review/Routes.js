import React, { PropTypes } from 'react';
import { createStyleSheet } from 'jss-theme-reactor';
import Text from 'material-ui-build-next/src/Text';
import AppBar from 'material-ui-build-next/src/AppBar';
import Toolbar from 'material-ui-build-next/src/Toolbar';
import withStyles from 'material-ui-build-next/src/styles/withStyles';
import { white } from 'material-ui-build-next/src/styles/colors';

const styleSheet = createStyleSheet('Routes', (theme) => {
  return {
    '@global': {
      html: {
        background: theme.palette.background.default,
        fontFamily: theme.typography.fontFamily,
        WebkitFontSmoothing: 'antialiased', // Antialiasing.
        MozOsxFontSmoothing: 'grayscale', // Antialiasing.
      },
      body: {
        margin: 0,
      },
    },
    title: {
      color: white,
    },
  };
});

function Routes(props) {
  const {
    classes,
  } = props;

  return (
    <AppBar>
      <Toolbar>
        <Text className={classes.title} type="title" colorInherit>
          {'Argos'}
        </Text>
      </Toolbar>
    </AppBar>
  );
}

Routes.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styleSheet)(Routes);
