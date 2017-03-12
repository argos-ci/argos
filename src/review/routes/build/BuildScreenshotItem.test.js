import React from 'react'
import { shallow as enzymeShallow } from 'enzyme'
import createShallow from 'review/test/createShallow'
import ItemStatus from 'review/modules/components/ItemStatus'
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
})
