import React from 'react';
import MuiThemeProvider from 'material-ui-build-next/src/styles/MuiThemeProvider';
import createStyleManager from 'modules/styles/createStyleManager';
import Routes from './Routes';

function Root() {
  const styles = createStyleManager();
  const { styleManager, theme } = styles;

  return (
    <MuiThemeProvider theme={theme} styleManager={styleManager}>
      <Routes />
    </MuiThemeProvider>
  );
}

export default Root;
