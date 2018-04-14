/* eslint-disable react/no-multi-comp */
import React from 'react'
import PropTypes from 'prop-types'
import CircularProgress from 'material-ui/Progress/CircularProgress'
import Typography from 'material-ui/Typography'
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
  const { children, task, onlySuccess } = props

  if (isError(task) && !onlySuccess) {
    return renderInContainer(props, <Typography>The loading failed</Typography>)
  }

  if (task.state === PROGRESS && !onlySuccess) {
    return renderInContainer(props, <CircularProgress />)
  }

  if (task.state === SUCCESS) {
    return children(task.output.data)
  }

  return null
}

WatchTask.propTypes = {
  children: PropTypes.func.isRequired,
  Container: PropTypes.func,
  onlySuccess: PropTypes.bool,
  task: PropTypes.shape({
    state: PropTypes.oneOf([PROGRESS, SUCCESS, ERROR]),
    output: PropTypes.object,
  }).isRequired,
}

WatchTask.defaultProps = {
  Container: WatchTaskContainer,
  onlySuccess: false,
}

export const watchTask = recompact.createHelper(
  mapProps => BaseComponent => props => (
    <WatchTask {...mapProps(props)}>
      {() => recompact.createEagerElement(BaseComponent, props)}
    </WatchTask>
  ),
  'watchTask'
)
