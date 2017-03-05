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

    it('should be failure', () => {
      const wrapper = shallow(
        <BuildSummary
          classes={{}}
          fetch={fetch}
          onValidationClick={() => {}}
        />,
      )
      const wrapperWatchTask = wrapper.find('WatchTask').shallow()

      assert.strictEqual(wrapperWatchTask.contains('Job status: failure'), true)
    })
  })
})
