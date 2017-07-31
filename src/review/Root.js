/* eslint-disable global-require, no-underscore-dangle */

import React from 'react'
import { createStore, applyMiddleware, compose, combineReducers } from 'redux'
import { combineEpics, createEpicMiddleware } from 'redux-observable'
import { ApolloProvider } from 'react-apollo'
import { reducer as formReducer } from 'redux-form'
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider'
import metricsMiddleware from 'browser-metrics/lib/reduxMetricsMiddleware'
import theme from 'modules/styles/theme'
import analytics from 'modules/analytics'
import initApollo from 'modules/apollo/initApollo'
import dataReducer from 'modules/redux/dataReducer'
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

const apollo = initApollo()

const rootEpic = combineEpics(
  accountEpic,
  buildEpic,
  repositoryEpic,
  repositoryDetailsEpic,
  profileEpic,
  dashboardEpic
)

let middlewares = [
  apollo.middleware(),
  metricsMiddleware({
    trackTiming: analytics.trackTiming,
  }),
  createEpicMiddleware(rootEpic),
]

if (process.env.NODE_ENV !== 'production' && !window.__REDUX_DEVTOOLS_EXTENSION__) {
  const createLogger = require('redux-logger').createLogger

  middlewares = [...middlewares, createLogger()]
}

const rootReducers = combineReducers({
  apollo: apollo.reducer(),
  ui: combineReducers({
    account: accountReducer,
    build: buildReducer,
    repository: repositoryReducer,
    repositoryDetails: repositoryDetailsReducer,
    profile: profileReducer,
    dashboard: dashboardReducer,
  }),
  data: dataReducer,
  form: formReducer,
})

const composeEnhancers =
  (process.env.NODE_ENV !== 'production' && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) || compose

const store = composeEnhancers(applyMiddleware(...middlewares))(createStore)(rootReducers)

function Root() {
  return (
    <ApolloProvider client={apollo} store={store}>
      <MuiThemeProvider theme={theme}>
        <Routes />
      </MuiThemeProvider>
    </ApolloProvider>
  )
}

export default Root
