// @flow weak

import React, { PropTypes } from 'react';
import compose from 'recompose/compose';
import pure from 'recompose/pure';
import { createStyleSheet } from 'jss-theme-reactor';
import withStyles from 'material-ui-build-next/src/styles/withStyles';
import Text from 'material-ui-build-next/src/Text';
import LayoutBody from 'modules/components/LayoutBody';

const styleSheet = createStyleSheet('ProductArgument', () => ({
  screen: {
    overflow: 'auto',
    paddingTop: 8 * 2,
    paddingBottom: 8 * 2,
  },
  description: {
    maxWidth: 650,
  },
}));

function ProductArgument(props) {
  const {
    classes,
    description,
    title,
  } = props;

  return (
    <div className={classes.screen}>
      <LayoutBody margin bottom={false}>
        <Text type="title" component="h3" gutterBottom>
          {title}
        </Text>
        <Text type="subheading" component="p" className={classes.description}>
          {description}
        </Text>
      </LayoutBody>
    </div>
  );
}

ProductArgument.propTypes = {
  classes: PropTypes.object.isRequired,
  description: PropTypes.string,
  title: PropTypes.string,
};

export default compose(
  pure,
  withStyles(styleSheet),
)(ProductArgument);
