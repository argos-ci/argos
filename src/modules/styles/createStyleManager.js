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
  black,
} from 'material-ui/styles/colors'

const createStyleManager = () => MuiThemeProvider.createDefaultContext({
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
      error: black,
      unknown: orange[500],
    },
    brandColor: '#1C2541',
  }),
})

export default createStyleManager
