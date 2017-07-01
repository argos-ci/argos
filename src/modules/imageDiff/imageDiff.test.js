import path from 'path'
import imageDiff from './imageDiff'

function round(total) {
  // Avoid precision issues relative to Linux / macOS
  return Math.round(total)
}

describe('imageDiff', () => {
  it('simple', async () => {
    const result = await imageDiff({
      compareScreenshotPath: path.join(__dirname, '__fixtures__/simple/compare.png'),
      baseScreenshotPath: path.join(__dirname, '__fixtures__/simple/base.png'),
      diffResultPath: path.join(__dirname, '__fixtures__/simple/diff_tmp.png'),
    })

    expect(round(result.total)).toBe(1961)
    expect(result.percentage).toBe(0.0299183)
  })

  it('alphaBackground', async () => {
    const result = await imageDiff({
      compareScreenshotPath: path.join(__dirname, '__fixtures__/alphaBackground/compare.png'),
      baseScreenshotPath: path.join(__dirname, '__fixtures__/alphaBackground/base.png'),
      diffResultPath: path.join(__dirname, '__fixtures__/alphaBackground/diff_tmp.png'),
    })

    expect(round(result.total)).toBe(3)
    expect(result.percentage).toBe(0.0000444664)
  })

  it('boxShadow', async () => {
    const result = await imageDiff({
      compareScreenshotPath: path.join(__dirname, '__fixtures__/boxShadow/compare.png'),
      baseScreenshotPath: path.join(__dirname, '__fixtures__/boxShadow/base.png'),
      diffResultPath: path.join(__dirname, '__fixtures__/boxShadow/diff_tmp.png'),
    })

    expect(round(result.total)).toBe(17)
    expect(result.percentage).toBe(0.000255956)
  })

  it('fontAliasing', async () => {
    const result = await imageDiff({
      compareScreenshotPath: path.join(__dirname, '__fixtures__/fontAliasing/compare.png'),
      baseScreenshotPath: path.join(__dirname, '__fixtures__/fontAliasing/base.png'),
      diffResultPath: path.join(__dirname, '__fixtures__/fontAliasing/diff_tmp.png'),
    })

    expect(round(result.total)).toBe(346)
    expect(result.percentage).toBe(0.00527853)
  })

  it('imageCompression', async () => {
    const result = await imageDiff({
      compareScreenshotPath: path.join(__dirname, '__fixtures__/imageCompression/compare.png'),
      baseScreenshotPath: path.join(__dirname, '__fixtures__/imageCompression/base.png'),
      diffResultPath: path.join(__dirname, '__fixtures__/imageCompression/diff_tmp.png'),
    })

    expect(round(result.total)).toBe(5)
    expect(result.percentage).toBe(0.000079001)
  })
})
