import path from 'path'
import imageDifference from './imageDifference'

describe('imageDifference', () => {
  it('simple', async () => {
    const result = await imageDifference({
      compareScreenshotPath: path.join(__dirname, '__fixtures__/simple/compare.png'),
      baseScreenshotPath: path.join(__dirname, '__fixtures__/simple/base.png'),
      diffResultPath: path.join(__dirname, '__fixtures__/simple/diff_tmp.png'),
    })

    expect(result.score > 0).toBe(true)
    expect(result).toMatchSnapshot()
  })

  it('simple with enough fuzz', async () => {
    const result = await imageDifference({
      compareScreenshotPath: path.join(__dirname, '__fixtures__/simple/compare.png'),
      baseScreenshotPath: path.join(__dirname, '__fixtures__/simple/base.png'),
      diffResultPath: path.join(__dirname, '__fixtures__/simple/diff_tmp.png'),
      fuzz: 70 ** 2,
    })

    expect(result.score).toBe(0)
    expect(result).toMatchSnapshot()
  })

  it('alphaBackground', async () => {
    const result = await imageDifference({
      compareScreenshotPath: path.join(__dirname, '__fixtures__/alphaBackground/compare.png'),
      baseScreenshotPath: path.join(__dirname, '__fixtures__/alphaBackground/base.png'),
      diffResultPath: path.join(__dirname, '__fixtures__/alphaBackground/diff_tmp.png'),
    })

    expect(result.score).toBe(0)
    expect(result).toMatchSnapshot()
  })

  it('boxShadow', async () => {
    const result = await imageDifference({
      compareScreenshotPath: path.join(__dirname, '__fixtures__/boxShadow/compare.png'),
      baseScreenshotPath: path.join(__dirname, '__fixtures__/boxShadow/base.png'),
      diffResultPath: path.join(__dirname, '__fixtures__/boxShadow/diff_tmp.png'),
    })

    expect(result.score).toBe(0)
    expect(result).toMatchSnapshot()
  })

  it('border', async () => {
    const result = await imageDifference({
      compareScreenshotPath: path.join(__dirname, '__fixtures__/border/compare.png'),
      baseScreenshotPath: path.join(__dirname, '__fixtures__/border/base.png'),
      diffResultPath: path.join(__dirname, '__fixtures__/border/diff_tmp.png'),
    })

    expect(result.score).toBe(0)
    expect(result).toMatchSnapshot()
  })

  it('fontAliasing', async () => {
    const result = await imageDifference({
      compareScreenshotPath: path.join(__dirname, '__fixtures__/fontAliasing/compare.png'),
      baseScreenshotPath: path.join(__dirname, '__fixtures__/fontAliasing/base.png'),
      diffResultPath: path.join(__dirname, '__fixtures__/fontAliasing/diff_tmp.png'),
    })

    expect(result).toMatchSnapshot()
  })

  it('imageCompression', async () => {
    const result = await imageDifference({
      compareScreenshotPath: path.join(__dirname, '__fixtures__/imageCompression/compare.png'),
      baseScreenshotPath: path.join(__dirname, '__fixtures__/imageCompression/base.png'),
      diffResultPath: path.join(__dirname, '__fixtures__/imageCompression/diff_tmp.png'),
    })

    expect(result.score).toBe(0)
    expect(result).toMatchSnapshot()
  })

  it('imageCompression2', async () => {
    const result = await imageDifference({
      compareScreenshotPath: path.join(__dirname, '__fixtures__/imageCompression2/compare.png'),
      baseScreenshotPath: path.join(__dirname, '__fixtures__/imageCompression2/base.png'),
      diffResultPath: path.join(__dirname, '__fixtures__/imageCompression2/diff_tmp.png'),
    })

    expect(result).toMatchSnapshot()
  })

  it('imageCompression3', async () => {
    const result = await imageDifference({
      compareScreenshotPath: path.join(__dirname, '__fixtures__/imageCompression3/compare.png'),
      baseScreenshotPath: path.join(__dirname, '__fixtures__/imageCompression3/base.png'),
      diffResultPath: path.join(__dirname, '__fixtures__/imageCompression3/diff_tmp.png'),
    })

    expect(result).toMatchSnapshot()
  })
})
