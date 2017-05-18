import url from 'url'
import analytics from 'modules/analytics'

const plugAnalyticsMiddleware = {
  renderRouterContext: (child, props) => {
    // Side effect.
    analytics.trackView(url.format(props.location))

    return child
  },
}

export default plugAnalyticsMiddleware
