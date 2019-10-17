import React from 'react'
import PropTypes from 'prop-types'
import recompact from 'modules/recompact'
import Switch from 'material-ui/Switch'
import { ListItem, ListItemText } from 'material-ui/List'

function RepositoryListItem(props) {
  const { repository, onToggle } = props
  const uri = `${repository.owner.login}/${repository.name}`

  return (
    <ListItem button key={uri} onClick={onToggle}>
      <ListItemText primary={uri} />
      <Switch checked={repository.enabled} />
    </ListItem>
  )
}

RepositoryListItem.propTypes = {
  onToggle: PropTypes.func.isRequired,
  repository: PropTypes.shape({
    owner: PropTypes.object.isRequired,
    name: PropTypes.string.isRequired,
    enabled: PropTypes.bool.isRequired,
  }).isRequired,
}

export default recompact.withHandlers({
  onToggle: ({ onToggle, repository }) => () =>
    onToggle({
      repositoryId: repository.id,
      enabled: !repository.enabled,
    }),
})(RepositoryListItem)
