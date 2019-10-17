import React from 'react'
import { createShallow } from 'material-ui/test-utils'
import BuildSummary from 'review/routes/build/BuildSummary'
import Build from './Build'

describe('<Build />', () => {
  let shallow
  let fetch
  let params

  beforeAll(() => {
    shallow = createShallow({
      context: {
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
      .find('WatchTask')
      .shallow()
    expect(wrapper.debug()).toContain('Build not found.')
  })

  it('should render the children', () => {
    const wrapper = shallow(<Build params={params} />)
      .until('Build')
      .find('WatchTask')
      .shallow()
    expect(wrapper.find(BuildSummary).length).toBe(1)
  })
})
