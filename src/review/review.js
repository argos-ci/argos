import React from 'react';
import { render } from 'react-dom';
import { AppContainer } from 'react-hot-loader';
import Root from './Root';

const renderRoot = () => {
  render(
    <AppContainer>
      <Root />
    </AppContainer>,
    document.getElementById('root'),
  );
};

renderRoot();

// Hot Module Replacement API
if (module.hot) {
  module.hot.accept('./Root', renderRoot);
}
