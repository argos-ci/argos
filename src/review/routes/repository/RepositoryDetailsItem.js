import React from 'react'
import PropTypes from 'prop-types'
import { ListItem, ListItemText } from 'material-ui/List'
import Link from 'modules/components/Link'
import ItemStatus from 'review/modules/components/ItemStatus'

function RepositoryDetailsItem(props) {
  const {
    build: { id, status, createdAt, number },
    profileName,
    repositoryName,
  } = props

  return (
    <ItemStatus status={status}>
      <ListItem
        button
        component={Link}
        variant="button"
        to={`/${profileName}/${repositoryName}/builds/${id}`}
      >
        <ListItemText
          primary={`build ${number}`}
          secondary={new Intl.DateTimeFormat().format(new Date(createdAt))}
        />
      </ListItem>
    </ItemStatus>
  )
}

RepositoryDetailsItem.propTypes = {
  build: PropTypes.shape({
    id: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    number: PropTypes.number.isRequired,
    createdAt: PropTypes.string.isRequired,
  }).isRequired,
  profileName: PropTypes.string.isRequired,
  repositoryName: PropTypes.string.isRequired,
}

export default RepositoryDetailsItem
