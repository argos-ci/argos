import { createMuiTheme } from 'material-ui/styles'
import { brown, deepOrange, red, green, orange, grey } from 'material-ui/colors'
import common from 'material-ui/colors/common'

const theme = createMuiTheme({
  palette: {
    primary: brown,
    secondary: deepOrange,
  },
  status: {
    success: green[500],
    failure: red[500],
    progress: grey[500],
    pending: grey[500],
    error: common.black,
    unknown: orange[500],
  },
  brandColor: '#1C2541',
})

export default theme
