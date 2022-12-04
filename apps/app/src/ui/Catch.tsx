import { captureException } from "@sentry/browser";
import { Component } from "react";

export interface CatchProps {
  capture?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

interface CatchState {
  error: any;
}

export class Catch extends Component<CatchProps, CatchState> {
  constructor(props: CatchProps) {
    super(props);
    this.state = { error: null };
  }

  static defaultProps = {
    capture: true,
    fallback: null,
  };

  static getDerivedStateFromError(error: any) {
    return { error };
  }

  override componentDidCatch(error: any) {
    if (this.props.capture) {
      captureException(error);
    }
  }

  override render() {
    if (this.state.error) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
