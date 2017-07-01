import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import intersection from 'lodash/intersection'
import wrapDisplayName from 'recompact/wrapDisplayName'
import createEagerFactory from 'recompact/createEagerFactory'
import ClientErrorView from 'review/modules/components/ClientErrorView'

const restrictedPage = options => BaseComponent => {
  const { scopes } = options
  const factory = createEagerFactory(BaseComponent)

  function RestrictedPage(props) {
    if (!props.user) {
      return (
        <ClientErrorView
          title={'Authentication error'}
          message={'You need to be log in to access this page.'}
        />
      )
    }

    if (intersection(props.user.scopes, scopes).length !== scopes.length) {
      return (
        <ClientErrorView
          title={'Authorisation error'}
          message={"You don't have the access rights needed."}
        />
      )
    }

    return factory(props)
  }

  RestrictedPage.propTypes = {
    user: PropTypes.object,
  }

  if (process.env.NODE_ENV !== 'production') {
    RestrictedPage.displayName = wrapDisplayName(BaseComponent, 'restrictedPage')
  }

  return connect(state => ({
    user: state.data.user,
  }))(RestrictedPage)
}

export default restrictedPage
