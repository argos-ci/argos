import React from 'react'
import { assert } from 'chai'
import { shallow } from 'enzyme'
import { BuildSummary } from './BuildSummary'

describe('<BuildSummary />', () => {
  describe('jobStatus', () => {
    let fetch

    beforeEach(() => {
      fetch = {
        state: 'SUCCESS',
        output: {
          data: {
            build: {
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

    it('should be complete when everything is done', () => {
      fetch.output.data.screenshotDiffs = [{
        jobStatus: 'complete',
      }]

      const wrapper = shallow(<BuildSummary classes={{}} fetch={fetch} />)
      const wrapperWatchTask = wrapper.find('WatchTask').shallow()

      assert.strictEqual(wrapperWatchTask.contains('Job status: complete'), true)
    })

    it('should be progress when something has been done or is in progress', () => {
      fetch.output.data.screenshotDiffs = [{
        jobStatus: 'complete',
      }, {
        jobStatus: 'pending',
      }]

      const wrapper = shallow(<BuildSummary classes={{}} fetch={fetch} />)
      const wrapperWatchTask = wrapper.find('WatchTask').shallow()

      assert.strictEqual(wrapperWatchTask.contains('Job status: progress'), true)
    })

    it('should be pending when nothing started', () => {
      fetch.output.data.screenshotDiffs = [{
        jobStatus: 'pending',
      }, {
        jobStatus: 'pending',
      }]

      const wrapper = shallow(<BuildSummary classes={{}} fetch={fetch} />)
      const wrapperWatchTask = wrapper.find('WatchTask').shallow()

      assert.strictEqual(wrapperWatchTask.contains('Job status: pending'), true)
    })
  })
})
