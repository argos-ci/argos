// @flow weak

import MuiThemeProvider from 'material-ui-build-next/src/styles/MuiThemeProvider';
import createPalette from 'material-ui-build-next/src/styles/palette';
import createMuiTheme from 'material-ui-build-next/src/styles/theme';
import { brown, deepOrange } from 'material-ui-build-next/src/styles/colors';

export default () => {
  return MuiThemeProvider.createDefaultContext({
    theme: createMuiTheme({
      palette: createPalette({
        primary: brown,
        accent: deepOrange,
        type: 'light',
      }),
    }),
  });
};
