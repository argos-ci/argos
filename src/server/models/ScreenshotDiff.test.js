import { assert } from 'chai'
import { VALIDATION_STATUS } from 'server/constants'
import ScreenshotDiff from './ScreenshotDiff'

const baseData = {
  buildId: '1',
  baseScreenshotId: '1',
  compareScreenshotId: '2',
  jobStatus: 'pending',
  validationStatus: VALIDATION_STATUS.unknown,
}

describe('models/ScreenshotDiff', () => {
  describe('validation', () => {
    it('should throw if the score is invalid', () => {
      assert.throws(() => {
        ScreenshotDiff.fromJson({
          ...baseData,
          score: 2,
        })
      }, 'should be <= 1')
    })

    it('should not throw if the score is valid', () => {
      assert.doesNotThrow(() => {
        ScreenshotDiff.fromJson({
          ...baseData,
          score: 1,
        })
      })
    })

    it('should throw if the screenshots are the same', () => {
      assert.throws(() => {
        ScreenshotDiff.fromJson({
          ...baseData,
          compareScreenshotId: '1',
        })
      }, 'The base screenshot should be different to the compare one.')
    })

    it('should not throw if the screenshots are different', () => {
      assert.doesNotThrow(() => {
        ScreenshotDiff.fromJson(baseData)
      })
    })
  })
})
