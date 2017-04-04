/* eslint-disable react/no-multi-comp */
import React, { PropTypes } from 'react'
import CircularProgress from 'material-ui/Progress/CircularProgress'
import Text from 'material-ui/Text'
import recompact from 'modules/recompact'
import { PROGRESS, SUCCESS, ERROR, isError } from 'modules/rxjs/operator/watchTask'
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
    task,
  } = props

  if (isError(props.task)) {
    return renderInContainer(props,
      <Text>
        The loading failed
      </Text>,
    )
  }

  if (task.state === PROGRESS) {
    return renderInContainer(props, <CircularProgress />)
  }

  if (task.state === SUCCESS) {
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

export const watchTask = recompact.createHelper(mapProps => BaseComponent => props => (
  <WatchTask {...mapProps(props)}>
    {() => recompact.createEagerElement(BaseComponent, props)}
  </WatchTask>
), 'watchTask')
