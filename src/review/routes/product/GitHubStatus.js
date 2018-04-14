import React from 'react'
import classNames from 'classnames'
import PropTypes from 'prop-types'
import { withStyles } from 'material-ui/styles'

const codecov =
  'https://codecov.io/gh/callemall/material-ui/compare/306a500828ab4e78561753ecc6402403db1cb276...f6fee890063fea05d9d07ea03a59684503cac292'

const styles = {
  root: {
    display: 'flex',
    alignItems: 'flex-start',
    fontFamily: `-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial,
      sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"`,
    WebkitFontSmoothing: 'subpixel-antialiased',
  },
  code: {
    fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace',
    fontSize: 12,
    color: '#959da5',
    textDecoration: 'none',
    margin: '12px 6px',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
  button: {
    margin: '10px 0px',
  },
  statusActions: {
    marginLeft: 'auto',
    opacity: 0.6,
    color: '#0366d6',
    textDecoration: 'none',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
  statusActionsActive: {
    opacity: 1,
  },
  '@global': {
    '.avatar': {
      display: 'inline-block',
      overflow: 'hidden',
      lineHeight: 1,
      verticalAlign: 'middle',
      borderRadius: 3,
    },
    '.mr-2': {
      marginRight: 8,
    },
    '.merge-status-icon': {
      width: 30,
      marginRight: 12,
    },
    '.flex-self-center': {
      alignSelf: 'center',
    },
    '.text-gray': {
      color: '#586069',
    },
    '.col-10': {
      width: '83.33333%',
    },
    '.d-flex': {
      display: 'flex',
    },
    '.d-block': {
      display: 'block',
    },
    '.mx-auto': {
      marginRight: 'auto',
      marginLeft: 'auto',
    },
    '.text-green': {
      color: '#28a745',
    },
    '.octicon': {
      fill: 'currentColor',
    },
    '.flex-shrink-0': {
      flexShrink: 0,
    },
    '.col-2': {
      width: '16.66667%',
    },
    '.merge-status-item': {
      position: 'relative',
      padding: '10px 15px',
      paddingLeft: 12,
      backgroundColor: '#fafbfc',
      borderBottom: '1px solid #e1e4e8',
    },
    '.merge-status-list': {
      padding: 0,
      margin: '15px -15px -16px -15px',
      overflowY: 'auto',
      border: 'solid #e1e4e8',
      borderWidth: '1px 0 0',
      transition: 'max-height 0.25s ease-in-out',
      maxHeight: 170,
      borderBottom: 0,
    },
    '.css-truncate': {
      maxWidth: '100%',
      display: 'inline-block',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      verticalAlign: 'top',
    },
    '.branch-action-item': {
      padding: 15,
      fontSize: 13,
      lineHeight: 1.4,
    },
    '.dropdown-menu': {
      position: 'relative',
      maxWidth: 350,
      paddingTop: 0,
      paddingBottom: 0,
      marginTop: 0,
      marginRight: 10,
      backgroundColor: '#fff',
      backgroundClip: 'padding-box',
      border: '1px solid rgba(27,31,35,0.15)',
      borderRadius: 4,
      boxShadow: '0 3px 12px rgba(27,31,35,0.15)',
    },
    '.dropdown-menu::before, .dropdown-menu::after': {
      position: 'absolute',
      display: 'inline-block',
      content: '""',
    },
    '.dropdown-menu::before': {
      top: 10,
      right: -16,
      left: 'auto',
      border: '8px solid transparent',
      borderColor: 'transparent',
      borderLeftColor: 'rgba(27,31,35,0.15)',
    },
    '.dropdown-menu::after': {
      top: 11,
      right: -14,
      left: 'auto',
      border: '7px solid transparent',
      borderColor: 'transparent',
      borderLeftColor: '#fff',
    },
    '.btn-link': {
      display: 'inline-block',
      padding: 0,
      fontSize: 'inherit',
      textDecoration: 'none',
      whiteSpace: 'nowrap',
      cursor: 'pointer',
      userSelect: 'none',
      backgroundColor: 'transparent',
      border: 0,
      appearance: 'none',
    },
    '.status-heading': {
      fontSize: 16,
      fontWeight: '600',
      marginTop: 0,
      marginBottom: 1,
    },
    '.status-meta': {
      color: '#586069',
    },
    '.text-emphasized': {
      fontWeight: '600',
      color: '#24292e',
    },
  },
}

function GitHubStatus(props) {
  const { classes } = props

  return (
    <div className={classes.root}>
      <div className="dropdown-menu">
        <div className="branch-action-item">
          <h4 className="status-heading">All checks have passed</h4>
          <span className="status-meta">4 successful checks</span>
          <div className="merge-status-list">
            <div className="d-flex merge-status-item">
              <div className="merge-status-icon flex-self-center">
                <svg
                  aria-hidden="true"
                  className="octicon mx-auto d-block text-green"
                  height="16"
                  viewBox="0 0 12 16"
                  width="12"
                >
                  <path fillRule="evenodd" d="M12 5l-8 8-4-4 1.5-1.5L4 10l6.5-6.5z" />
                </svg>
              </div>
              <a
                href="https://www.argos-ci.com/"
                className="mr-2"
                aria-label="argos (@argos-ci) generated this status."
              >
                <img
                  alt=""
                  className="avatar"
                  height="20"
                  src="https://avatars1.githubusercontent.com/u/24552866?v=3&amp;s=40"
                  width="20"
                />
              </a>
              <div className="text-gray col-10 css-truncate" title="Difference accepted.">
                <strong className="text-emphasized">argos</strong>
                {' — Difference accepted.'}
              </div>
              <div className="d-flex col-2 flex-shrink-0">
                <a
                  className={classNames(classes.statusActions, classes.statusActionsActive)}
                  href="https://www.argos-ci.com/callemall/material-ui/builds/3176"
                >
                  Details
                </a>
              </div>
            </div>
            <div className="d-flex merge-status-item">
              <div className="merge-status-icon flex-self-center">
                <svg
                  aria-hidden="true"
                  className="octicon mx-auto d-block text-green"
                  height="16"
                  viewBox="0 0 12 16"
                  width="12"
                >
                  <path fillRule="evenodd" d="M12 5l-8 8-4-4 1.5-1.5L4 10l6.5-6.5z" />
                </svg>
              </div>
              <a
                href="http://circleci.com"
                className="mr-2"
                aria-label="Circle (@circleci) generated this status."
              >
                <img
                  alt=""
                  className="avatar"
                  height="20"
                  src="https://avatars0.githubusercontent.com/u/1231870?v=3&amp;s=40"
                  width="20"
                />
              </a>
              <div className="text-gray col-10 css-truncate" title="Your tests passed on CircleCI!">
                <strong className="text-emphasized">ci/circleci</strong>
                {' — Your tests passed on CircleCI!'}
              </div>
              <div className="d-flex col-2 flex-shrink-0">
                <a
                  className={classes.statusActions}
                  href="https://circleci.com/gh/callemall/material-ui/2592"
                >
                  Details
                </a>
              </div>
            </div>
            <div className="d-flex merge-status-item">
              <div className="merge-status-icon flex-self-center">
                <svg
                  aria-hidden="true"
                  className="octicon mx-auto d-block text-green"
                  height="16"
                  viewBox="0 0 12 16"
                  width="12"
                >
                  <path fillRule="evenodd" d="M12 5l-8 8-4-4 1.5-1.5L4 10l6.5-6.5z" />
                </svg>
              </div>
              <a
                href="https://codecov.io"
                className="mr-2"
                aria-label="Codecov (@codecov) generated this status."
              >
                <img
                  alt=""
                  className="avatar"
                  height="20"
                  src="https://avatars2.githubusercontent.com/oa/119817?v=3&amp;u=87428f0e56edc927fcf673c0bdaf0f175aba9aed&amp;s=40"
                  width="20"
                />
              </a>
              <div
                className="text-gray col-10 css-truncate"
                title="100% of diff hit (target 97.98%)"
              >
                <strong className="text-emphasized">codecov/patch</strong>
                {' — 100% of diff hit (target 97.98%)'}
              </div>
              <div className="d-flex col-2 flex-shrink-0">
                <a className={classes.statusActions} href={codecov}>
                  Details
                </a>
              </div>
            </div>
            <div className="d-flex merge-status-item">
              <div className="flex-self-center merge-status-icon">
                <svg
                  aria-hidden="true"
                  className="octicon mx-auto d-block text-green"
                  height="16"
                  viewBox="0 0 12 16"
                  width="12"
                >
                  <path fillRule="evenodd" d="M12 5l-8 8-4-4 1.5-1.5L4 10l6.5-6.5z" />
                </svg>
              </div>
              <a
                href="https://codecov.io"
                className="mr-2"
                aria-label="Codecov (@codecov) generated this status."
              >
                <img
                  alt=""
                  className="avatar"
                  height="20"
                  src="https://avatars2.githubusercontent.com/oa/119817?v=3&amp;u=87428f0e56edc927fcf673c0bdaf0f175aba9aed&amp;s=40"
                  width="20"
                />
              </a>
              <div
                className="text-gray col-10 css-truncate"
                title="98.03% (+0.05%) compared to 33fa3b6"
              >
                <strong className="text-emphasized">codecov/project</strong>
                {' — 98.03% (+0.05%) compared to 33fa3b6'}
              </div>
              <div className="d-flex col-2 flex-shrink-0">
                <a className={classes.statusActions} href={codecov}>
                  Details
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
      <button
        className={classNames('text-green btn-link', classes.button)}
        aria-label="4 / 4 checks OK"
        type="button"
      >
        <svg
          aria-hidden="true"
          className="octicon octicon-check"
          height="16"
          viewBox="0 0 12 16"
          width="12"
        >
          <path fillRule="evenodd" d="M12 5l-8 8-4-4 1.5-1.5L4 10l6.5-6.5z" />
        </svg>
      </button>
      <a className={classes.code} href="/callemall/material-ui/pull/6846/commits/f6fee89">
        f6fee89
      </a>
    </div>
  )
}

GitHubStatus.propTypes = {
  classes: PropTypes.object.isRequired,
}

export default withStyles(styles)(GitHubStatus)
