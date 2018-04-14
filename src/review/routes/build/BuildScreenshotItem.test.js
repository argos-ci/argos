import React from 'react'
import { createShallow } from 'material-ui/test-utils'
import Collapse from 'material-ui/transitions/Collapse'
import ItemStatus from 'review/modules/components/ItemStatus'
import BuildScreenshotItem from './BuildScreenshotItem'

describe('<BuildScreenshotItem />', () => {
  let shallow

  beforeAll(() => {
    shallow = createShallow()
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
    expect(
      wrapper
        .until('BuildScreenshotItem')
        .find(ItemStatus)
        .props().status
    ).toBe(status)
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
      expect(
        wrapper
          .until('BuildScreenshotItem')
          .find(Collapse)
          .props().in
      ).toBe(true)
    })

    it('should be closed when the score is zero', () => {
      const screenshotDiff = {
        score: 0,
        jobStatus: 'pending',
        baseScreenshot: {},
        compareScreenshot: {},
      }
      const wrapper = shallow(<BuildScreenshotItem screenshotDiff={screenshotDiff} />)
      expect(
        wrapper
          .until('BuildScreenshotItem')
          .find(Collapse)
          .props().in
      ).toBe(false)
    })
  })
})
