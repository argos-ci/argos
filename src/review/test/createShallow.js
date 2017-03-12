/**
 * Copy pasted from Material-UI, to be removed once we expose this helper.
 */

import { create } from 'jss'
import jssPreset from 'jss-preset-default'
import { createStyleManager } from 'jss-theme-reactor'
import { shallow as enzymeShallow } from 'enzyme'
import { createMuiTheme } from 'material-ui/styles/theme'

export default function createShallow(
  shallow = enzymeShallow,
  otherContext = {},
) {
  const theme = createMuiTheme()
  const jss = create(jssPreset())
  const styleManager = createStyleManager({ jss, theme })
  const context = {
    theme,
    styleManager,
    ...otherContext,
  }
  const shallowWithContext = function shallowWithContext(node) {
    return shallow(node, { context })
  }

  shallowWithContext.context = context

  shallowWithContext.cleanUp = () => {
    styleManager.reset()
  }

  return shallowWithContext
}
