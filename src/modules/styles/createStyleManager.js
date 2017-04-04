// @flow weak

import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider'
import createPalette from 'material-ui/styles/palette'
import createMuiTheme from 'material-ui/styles/theme'
import {
  brown,
  deepOrange,
  red,
  green,
  orange,
  grey,
} from 'material-ui/styles/colors'

export default () =>
  MuiThemeProvider.createDefaultContext({
    theme: createMuiTheme({
      palette: createPalette({
        primary: brown,
        accent: deepOrange,
        type: 'light',
      }),
      status: {
        success: green[500],
        failure: red[500],
        progress: grey[500],
        pending: grey[500],
        unknown: orange[500],
      },
    }),
  })
