import React from 'react'
import { assert } from 'chai'
import { shallow } from 'enzyme'
import { BuildSummaryBody } from './BuildSummaryBody'

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
      const wrapper = shallow(<BuildSummaryBody classes={{}} build={build} />)

      assert.strictEqual(wrapper.find('li').length, 4)
    })
  })
})
