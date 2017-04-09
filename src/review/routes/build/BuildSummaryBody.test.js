import React from 'react'
import { shallow } from 'enzyme'
import { BuildSummaryBodyView } from './BuildSummaryBody'

describe('<BuildSummaryBody />', () => {
  describe('compare', () => {
    it('should accept an empty baseScreenshotBucket', () => {
      const build = {
        status: 'failure',
        createdAt: '2017-03-31T19:22:19.392Z',
        baseScreenshotBucket: null,
        compareScreenshotBucket: {
          commit: '',
          branch: null,
        },
      }
      const wrapper = shallow(<BuildSummaryBodyView classes={{}} build={build} />)

      expect(wrapper.find('li').length).toBe(4)
    })
  })
})
