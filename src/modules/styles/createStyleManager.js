// @flow weak

import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider'
import createPalette from 'material-ui/styles/palette'
import createMuiTheme from 'material-ui/styles/theme'
import { brown, deepOrange } from 'material-ui/styles/colors'

export default () => {
  return MuiThemeProvider.createDefaultContext({
    theme: createMuiTheme({
      palette: createPalette({
        primary: brown,
        accent: deepOrange,
        type: 'light',
      }),
    }),
  })
}
