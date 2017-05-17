import React from 'react'
import { shallow as enzymeShallow } from 'enzyme'
import createShallow from 'material-ui/test-utils/createShallow'
import ItemStatus from 'modules/components/ItemStatus'
import BuildScreenshotItem from './BuildScreenshotItem'

describe('<BuildScreenshotItem />', () => {
  let shallow

  beforeAll(() => {
    shallow = createShallow(enzymeShallow, {
      store: {
        subscribe: () => {},
        dispatch: () => {},
        getState: () => ({
          data: {
            config: {
              s3: {
                screenshotsBucket: '',
              },
            },
          },
        }),
      },
    })
  })

  afterAll(() => {
    shallow.cleanUp()
  })

  it('should display a pending status', () => {
    const status = 'pending'
    const screenshotDiff = {
      score: null,
      jobStatus: status,
      baseScreenshot: {},
      compareScreenshot: {},
    }
    const wrapper = shallow(<BuildScreenshotItem screenshotDiff={screenshotDiff} />)
    expect(wrapper.until('BuildScreenshotItem').find(ItemStatus).props().status).toBe(status)
  })

  describe('expandIn', () => {
    it('should be opened when the score is not zero', () => {
      const screenshotDiff = {
        score: null,
        jobStatus: 'pending',
        baseScreenshot: {},
        compareScreenshot: {},
      }
      const wrapper = shallow(<BuildScreenshotItem screenshotDiff={screenshotDiff} />)
      expect(wrapper.until('BuildScreenshotItem').find('Collapse').props().in).toBe(true)
    })

    it('should be closed when the score is zero', () => {
      const screenshotDiff = {
        score: 0,
        jobStatus: 'pending',
        baseScreenshot: {},
        compareScreenshot: {},
      }
      const wrapper = shallow(<BuildScreenshotItem screenshotDiff={screenshotDiff} />)
      expect(wrapper.until('BuildScreenshotItem').find('Collapse').props().in).toBe(false)
    })
  })
})
