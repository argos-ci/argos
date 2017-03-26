import { assert } from 'chai'
import ScreenshotBucket from './ScreenshotBucket'

const baseData = {
  name: '878',
  branch: 'BUGS-130',
  commit: 'ff4474843ccab36e72814e321cbf6ab6a6303385',
}

describe('ScreenshotBucket', () => {
  describe('validation commit', () => {
    it('should throw if the screenshot buckets are the same', () => {
      expect.assertions(1)
      try {
        ScreenshotBucket.fromJson({
          ...baseData,
          commit: 'esfsefsfsef',
        })
      } catch (error) {
        expect(JSON.parse(error.message)).toEqual({
          commit: [
            {
              message: 'should match pattern "^[a-zA-Z0-9]{40}$"',
              keyword: 'pattern',
              params: {
                pattern: '^[a-zA-Z0-9]{40}$',
              },
            },
          ],
        })
      }
    })

    it('should not throw if the screenshot buckets are different', () => {
      assert.doesNotThrow(() => {
        ScreenshotBucket.fromJson(baseData)
      })
    })
  })
})
