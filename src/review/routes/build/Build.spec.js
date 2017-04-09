import React from 'react'
import { shallow as enzymeShallow } from 'enzyme'
import createShallow from 'material-ui/test-utils/createShallow'
import BuildSummary from 'review/routes/build/BuildSummary'
import Build from './Build'

describe('<Build />', () => {
  describe('task', () => {
    let shallow
    let fetch
    let params

    beforeAll(() => {
      shallow = createShallow(enzymeShallow, {
        store: {
          subscribe: () => {},
          dispatch: () => {},
          getState: () => ({
            ui: {
              build: {
                fetch,
              },
            },
          }),
        },
      })
      params = {
        buildId: '1',
      }
    })

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

    it('should render an error message', () => {
      fetch.output.data.build = null

      const wrapper = shallow(<Build params={params} />)
        .until('Build')
        .find('WatchTask').shallow()
      expect(wrapper.debug()).toContain('Build not found.')
    })

    it('should render the children', () => {
      const wrapper = shallow(<Build params={params} />)
        .until('Build')
        .find('WatchTask').shallow()
      expect(wrapper.find(BuildSummary).length).toBe(1)
    })
  })
})
