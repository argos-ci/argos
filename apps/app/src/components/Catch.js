import React from 'react'
import * as Sentry from '@sentry/browser'

export class Catch extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    if (this.props.capture) {
      Sentry.captureException(error)
    }
  }

  render() {
    if (this.state.error) return this.props.fallback
    return this.props.children
  }
}

Catch.defaultProps = {
  capture: true,
  fallback: null,
}
