import React from 'react'
import {
  createStore,
  applyMiddleware,
  compose,
  combineReducers,
} from 'redux'
import { combineEpics, createEpicMiddleware } from 'redux-observable'
import { Provider } from 'react-redux'
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider'
import metricsMiddleware from 'browser-metrics/lib/reduxMetricsMiddleware'
import createStyleManager from 'modules/styles/createStyleManager'
import analytics from 'modules/analytics/analytics'
import dataReducer from 'review/modules/redux/dataReducer'
import Routes from 'review/Routes'
import buildReducer from 'review/routes/build/reducer'
import repositoryDetailsReducer from 'review/routes/repository/detailsReducer'
import buildEpic from 'review/routes/build/epic'
import repositoryDetailsEpic from 'review/routes/repository/detailsEpic'

const rootEpic = combineEpics(
  buildEpic,
  repositoryDetailsEpic,
)

let middlewares = [
  metricsMiddleware({
    trackTiming: analytics.trackTiming,
  }),
  createEpicMiddleware(rootEpic),
]

if (process.env.NODE_ENV === 'development' && !window.devToolsExtension) {
  const loggerMiddleware = require('redux-logger')

  middlewares = [
    ...middlewares,
    loggerMiddleware(),
  ]
}

const uiReducer = combineReducers({
  build: buildReducer,
  repositoryDetails: repositoryDetailsReducer,
})

const rootReducers = combineReducers({
  ui: uiReducer,
  data: dataReducer,
})

/* eslint-disable no-underscore-dangle */
const composeEnhancers = (process.env.NODE_ENV !== 'production' &&
  window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) || compose
/* eslint-enable no-underscore-dangle */

const store = composeEnhancers(
  applyMiddleware(...middlewares),
)(createStore)(rootReducers)

function Root() {
  const styles = createStyleManager()
  const { styleManager, theme } = styles

  return (
    <Provider store={store}>
      <MuiThemeProvider theme={theme} styleManager={styleManager}>
        <Routes />
      </MuiThemeProvider>
    </Provider>
  )
}

export default Root
