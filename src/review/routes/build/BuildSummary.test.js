import React from 'react'
import { assert } from 'chai'
import { shallow } from 'enzyme'
import BuildSummaryBody from 'review/routes/build/BuildSummaryBody'
import { BuildSummary } from './BuildSummary'

describe('<BuildSummary />', () => {
  describe('task', () => {
    let fetch

    beforeEach(() => {
      fetch = {
        state: 'SUCCESS',
        output: {
          data: {
            build: {
              status: 'failure',
              createdAt: null,
              baseScreenshotBucket: {
                commit: '',
              },
              compareScreenshotBucket: {
                commit: '',
                branch: null,
              },
            },
            screenshotDiffs: [],
          },
        },
      }
    })

    it('should render when success', () => {
      const wrapper = shallow(<BuildSummary classes={{}} fetch={fetch} />)
      const wrapperWatchTask = wrapper.find('WatchTask').shallow()
      assert.strictEqual(wrapperWatchTask.find(BuildSummaryBody).length, 1)
    })
  })
})
