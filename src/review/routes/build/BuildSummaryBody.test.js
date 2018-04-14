import React from 'react'
import { shallow } from 'enzyme'
import Link from 'modules/components/Link'
import { BuildSummaryBodyView } from './BuildSummaryBody'

describe('<BuildSummaryBody />', () => {
  describe('compare', () => {
    it('should accept an empty baseScreenshotBucket', () => {
      const build = {
        status: 'failure',
        createdAt: '2017-03-31T19:22:19.392Z',
        baseScreenshotBucket: null,
        compareScreenshotBucket: {
          commit: 'azerty',
          branch: null,
        },
        repository: {
          name: 'material-ui',
          owner: {
            login: 'callemall',
          },
        },
      }
      const wrapper = shallow(<BuildSummaryBodyView classes={{}} build={build} />)

      expect(wrapper.find('li').length).toBe(4)
      expect(
        wrapper
          .find(Link)
          .at(0)
          .props().href
      ).toBe('https://github.com/callemall/material-ui/commit/azerty')
    })
  })
})
