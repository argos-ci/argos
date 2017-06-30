import path from 'path'
import imageDiff from './imageDiff'

describe('imageDiff', () => {
  it('should diff between two images and return result', async () => {
    const result = await imageDiff({
      compareScreenshotPath: path.join(__dirname, '__fixtures__/simple/compare.png'),
      baseScreenshotPath: path.join(__dirname, '__fixtures__/simple/base.png'),
      diffResultPath: path.join(__dirname, '__fixtures__/simple/diff_tmp.png'),
    })

    // Avoid precision issues relative to Linux / macOS
    expect(Math.round(result.total)).toBe(2264)
    expect(result.percentage).toBe(0.0345467)
  })
})
