/* eslint-disable global-require */
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
import accountReducer from 'review/routes/profile/accountReducer'
import accountEpic from 'review/routes/profile/accountEpic'
import buildReducer from 'review/routes/build/buildReducer'
import buildEpic from 'review/routes/build/buildEpic'
import repositoryReducer from 'review/routes/repository/repositoryReducer'
import repositoryEpic from 'review/routes/repository/repositoryEpic'
import repositoryDetailsReducer from 'review/routes/repository/detailsReducer'
import repositoryDetailsEpic from 'review/routes/repository/detailsEpic'
import profileReducer from 'review/routes/profile/profileReducer'
import profileEpic from 'review/routes/profile/profileEpic'
import dashboardReducer from 'review/routes/dashboard/dashboardReducer'
import dashboardEpic from 'review/routes/dashboard/dashboardEpic'

const rootEpic = combineEpics(
  accountEpic,
  buildEpic,
  repositoryEpic,
  repositoryDetailsEpic,
  profileEpic,
  dashboardEpic,
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
  account: accountReducer,
  build: buildReducer,
  repository: repositoryReducer,
  repositoryDetails: repositoryDetailsReducer,
  profile: profileReducer,
  dashboard: dashboardReducer,
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
  const { styleManager, theme } = createStyleManager()

  return (
    <Provider store={store}>
      <MuiThemeProvider theme={theme} styleManager={styleManager}>
        <Routes />
      </MuiThemeProvider>
    </Provider>
  )
}

export default Root
