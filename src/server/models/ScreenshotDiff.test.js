import { assert } from 'chai'
import ScreenshotDiff from './ScreenshotDiff'

const baseData = {
  buildId: '1',
  baseScreenshotId: '1',
  compareScreenshotId: '2',
  jobStatus: 'pending',
  validationStatus: 'unknown',
}

describe('models/ScreenshotDiff', () => {
  describe('validation score', () => {
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
  })

  describe('validation screenshot', () => {
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
