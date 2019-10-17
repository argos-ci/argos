import React from 'react'
import { shallow } from 'enzyme'
import BuildSummaryBody from 'review/routes/build/BuildSummaryBody'
import { BuildSummaryView } from './BuildSummary'

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

    it('should render', () => {
      const wrapper = shallow(<BuildSummaryView classes={{}} fetch={fetch} />)
      expect(wrapper.find(BuildSummaryBody).length).toBe(1)
    })
  })
})
