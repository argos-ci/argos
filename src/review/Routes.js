import React, { PropTypes } from 'react';
import { createStyleSheet } from 'jss-theme-reactor';
import Text from 'material-ui-build-next/src/Text';
import AppBar from 'material-ui-build-next/src/AppBar';
import Toolbar from 'material-ui-build-next/src/Toolbar';
import withStyles from 'material-ui-build-next/src/styles/withStyles';
import { white } from 'material-ui-build-next/src/styles/colors';
import { browserHistory, Router, Route, IndexRoute } from 'react-router';
import Product from 'review/routes/product/Product';
import Profile from 'review/routes/profile/Profile';
import NotFound from 'review/routes/notFound/NotFound';
import Repository from 'review/routes/repository/Repository';
import Build from 'review/routes/build/Build';
import Settings from 'review/routes/settings/Settings';

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
    <div>
      <AppBar>
        <Toolbar>
          <Text className={classes.title} type="title" colorInherit>
            {'Argos'}
          </Text>
        </Toolbar>
      </AppBar>
      <br />
      <br />
      <br />
      <br />
      <Router history={browserHistory}>
        <Route path="/" component={Product} />
        <Route path="/profile/:profileId" component={Profile} />
        <Route path="/:profileId/:repositoryId">
          <IndexRoute component={Repository} />
          <Route path="builds/:buildId" component={Build} />
          <Route path="settings" component={Settings} />
        </Route>
        <Route path="*" component={NotFound} />
      </Router>
    </div>
  );
}

Routes.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styleSheet)(Routes);
