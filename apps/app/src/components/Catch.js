import { captureException } from "@sentry/browser";
import { Component } from "react";

export class Catch extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    if (this.props.capture) {
      captureException(error);
    }
  }

  render() {
    if (this.state.error) return this.props.fallback;
    return this.props.children;
  }
}

Catch.defaultProps = {
  capture: true,
  fallback: null,
};
