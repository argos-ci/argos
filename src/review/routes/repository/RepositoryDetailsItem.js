// @flow weak

import React, { PropTypes } from 'react'
import { Link as LinkRouter } from 'react-router'
import {
  ListItem,
  ListItemText,
} from 'material-ui/List'
import ItemStatus from 'review/modules/components/ItemStatus'
import { withStyles, createStyleSheet } from 'material-ui/styles'

const styleSheet = createStyleSheet('RepositoryDetailsItem', () => ({
}))

function RepositoryDetailsItem(props) {
  const {
    build: {
      id,
      status,
      createdAt,
      number,
    },
    profileName,
    repositoryName,
  } = props

  return (
    <ItemStatus status={status}>
      <ListItem
        button
        component={LinkRouter}
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
  classes: PropTypes.object.isRequired,
  profileName: PropTypes.string.isRequired,
  repositoryName: PropTypes.string.isRequired,
}

export default withStyles(styleSheet)(RepositoryDetailsItem)
