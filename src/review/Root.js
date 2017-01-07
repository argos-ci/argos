import React from 'react';
import {
  createStore,
  applyMiddleware,
  compose,
  combineReducers,
} from 'redux';
import { Provider } from 'react-redux';
import MuiThemeProvider from 'material-ui-build-next/src/styles/MuiThemeProvider';
import metricsMiddleware from 'browser-metrics/lib/reduxMetricsMiddleware';
import createStyleManager from 'modules/styles/createStyleManager';
import analytics from 'modules/analytics/analytics';
import Routes from 'review/Routes';
import buildReducer from 'review/routes/build/reducer';

let middlewares = [
  metricsMiddleware({
    trackTiming: analytics.trackTiming,
  }),
];

if (process.env.NODE_ENV === 'development' && !window.devToolsExtension) {
  const loggerMiddleware = require('redux-logger');

  middlewares = [
    ...middlewares,
    loggerMiddleware(),
  ];
}

const reducers = combineReducers({
  build: buildReducer,
});

const store = compose(
  applyMiddleware(...middlewares),
  window.devToolsExtension ? window.devToolsExtension() : x => x,
)(createStore)(reducers);

function Root() {
  const styles = createStyleManager();
  const { styleManager, theme } = styles;

  return (
    <Provider store={store}>
      <MuiThemeProvider theme={theme} styleManager={styleManager}>
        <Routes />
      </MuiThemeProvider>
    </Provider>
  );
}

export default Root;
