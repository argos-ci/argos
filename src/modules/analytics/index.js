import warning from 'warning'

const analytics = {
  trackView(page) {
    // https://developers.google.com/analytics/devguides/collection/analyticsjs/pages
    window.ga('set', 'page', page)
    window.ga('send', 'pageview')
  },
  trackEvent(category, action, label, value) {
    // https://developers.google.com/analytics/devguides/collection/analyticsjs/events
    window.ga('send', {
      hitType: 'event',
      eventCategory: category,
      eventAction: action,
      eventLabel: label,
      eventValue: value,
    })
  },
  trackTiming(category, metric, duration) {
    warning(duration === parseInt(duration, 10), 'The duration should be an integer')

    // https://developers.google.com/analytics/devguides/collection/analyticsjs/user-timings
    window.ga('send', {
      hitType: 'timing',
      timingCategory: category,
      timingVar: metric,
      timingValue: duration,
    })
  },
}

export default analytics
