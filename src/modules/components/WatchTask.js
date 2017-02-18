/* eslint-disable react/no-multi-comp */
import React, { PropTypes } from 'react'
import CircularProgress from 'material-ui/Progress/CircularProgress'
import Text from 'material-ui/Text'
import recompact from 'modules/recompact'
import { PROGRESS, SUCCESS, ERROR } from 'modules/rxjs/operator/watchTask'
import WatchTaskContainer from 'modules/components/WatchTaskContainer'

function renderInContainer(props, node) {
  const { Container } = props // eslint-disable-line react/prop-types

  if (Container) {
    return <Container>{node}</Container>
  }

  return node
}

export default function WatchTask(props) {
  const {
    children,
    task: {
      state,
      output,
    },
  } = props

  if (state === ERROR || (state === SUCCESS && output.errors)) {
    return renderInContainer(props,
      <Text>
        {'The loading failed'}
      </Text>,
    )
  }

  if (state === PROGRESS) {
    return renderInContainer(props, <CircularProgress />)
  }

  if (state === SUCCESS) {
    return children()
  }

  return null
}

WatchTask.propTypes = {
  children: PropTypes.func.isRequired,
  Container: PropTypes.func,
  task: PropTypes.shape({
    state: PropTypes.oneOf([
      PROGRESS,
      SUCCESS,
      ERROR,
    ]),
    output: PropTypes.object,
  }).isRequired,
}

WatchTask.defaultProps = {
  Container: WatchTaskContainer,
}

export const watchTask = recompact.createHelper(mapProps => BaseComponent => (props) => {
  return (
    <WatchTask {...mapProps(props)}>
      {() => recompact.createEagerElement(BaseComponent, props)}
    </WatchTask>
  )
}, 'watchTask')
