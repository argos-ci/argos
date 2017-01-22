/* eslint-disable react/no-multi-comp */
import React, { Component, PropTypes } from 'react'
import recompact from 'modules/recompact'
import CircularProgress from 'material-ui-build-next/src/Progress/CircularProgress'
import { PROGRESS, SUCCESS, ERROR } from 'modules/rxjs/operator/watchTask'
import WatchTaskContainer from 'modules/components/WatchTaskContainer'

function renderInContainer(props, node) {
  const { Container } = props // eslint-disable-line react/prop-types

  if (Container) {
    return <Container>{node}</Container>
  }

  return node
}

export default class WatchTask extends Component {
  static propTypes = {
    children: PropTypes.func.isRequired,
    Container: PropTypes.func,
    task: PropTypes.shape({
      state: PropTypes.oneOf([
        PROGRESS,
        SUCCESS,
        ERROR,
      ]),
    }).isRequired,
  };

  static defaultProps = {
    Container: WatchTaskContainer,
  };

  render() {
    const {
      children,
      task: {
        state,
      },
    } = this.props

    if (state === ERROR) {
      return renderInContainer(
        this.props,
        <div>
          {'The loading failed'}
        </div>,
      )
    }

    if (state === PROGRESS) {
      return renderInContainer(
        this.props,
        <CircularProgress />,
      )
    }

    if (state === SUCCESS) {
      return children()
    }

    return null
  }
}

export const watchTask = recompact.createHelper(mapProps => BaseComponent => (props) => {
  return (
    <WatchTask {...mapProps(props)}>
      {() => recompact.createEagerElement(BaseComponent, props)}
    </WatchTask>
  )
}, 'watchTask')
