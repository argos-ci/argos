// @flow weak

import React, { PropTypes } from 'react';
import classNames from 'classnames';
import { createStyleSheet } from 'jss-theme-reactor';
import withStyles from 'material-ui-build-next/src/styles/withStyles';

const styleSheet = createStyleSheet('LayoutBody', () => ({
  rootMargin: {
    margin: 8 * 2,
  },
  rootBottom: {
    marginBottom: 8 * 4,
  },
  rootResponsive: {
    '@media (min-width: 600px)': {
      width: 'auto',
      marginLeft: 40,
      marginRight: 40,
    },
    '@media (min-width: 920px)': {
      width: 840,
      marginLeft: 'auto',
      marginRight: 'auto',
    },
    '@media (min-width: 1260px)': {
      width: '66.66%',
    },
    '@media (min-width: 1800px)': {
      width: 1200,
    },
  },
  rootFullHeight: {
    height: '100%',
  },
}));

function LayoutBody(props) {
  const {
    bottom,
    children,
    classes,
    className,
    fullHeight,
    fullWidth,
    margin,
    style,
    ...other
  } = props;

  return (
    <div
      className={classNames(classes.root, {
        [classes.rootResponsive]: !fullWidth,
        [classes.rootFullHeight]: fullHeight,
        [classes.rootMargin]: margin,
        [classes.rootBottom]: bottom,
      }, className)}
      style={style}
      {...other}
    >
      {children}
    </div>
  );
}

LayoutBody.propTypes = {
  bottom: PropTypes.bool,
  children: PropTypes.node,
  classes: PropTypes.object.isRequired,
  className: PropTypes.string,
  fullHeight: PropTypes.bool,
  fullWidth: PropTypes.bool,
  margin: PropTypes.bool,
  style: PropTypes.object,
};

LayoutBody.defaultProps = {
  bottom: true,
  fullHeight: false,
  fullWidth: false,
  margin: false,
};

export default withStyles(styleSheet)(LayoutBody);
