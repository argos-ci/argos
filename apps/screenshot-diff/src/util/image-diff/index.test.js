import path from 'path'
import { diffImages } from './index'

describe('#diffImages', () => {
  it('simple', async () => {
    const result = await diffImages({
      actualFilename: path.join(__dirname, '__fixtures__/simple/compare.png'),
      expectedFilename: path.join(__dirname, '__fixtures__/simple/base.png'),
      diffFilename: path.join(__dirname, '__fixtures__/simple/diff_tmp.png'),
      fuzz: 900,
    })

    expect(result.score).toBeCloseTo(0.306, 2)
    expect(result.pixels).toBeCloseTo(501e3, -3)
  })

  it('simple with enough fuzz', async () => {
    const result = await diffImages({
      actualFilename: path.join(__dirname, '__fixtures__/simple/compare.png'),
      expectedFilename: path.join(__dirname, '__fixtures__/simple/base.png'),
      diffFilename: path.join(__dirname, '__fixtures__/simple/diff_tmp.png'),
      fuzz: 70 ** 2,
    })

    expect(result.score).toBe(0)
    expect(result).toMatchSnapshot()
  })

  it('alphaBackground', async () => {
    const result = await diffImages({
      actualFilename: path.join(
        __dirname,
        '__fixtures__/alphaBackground/compare.png',
      ),
      expectedFilename: path.join(
        __dirname,
        '__fixtures__/alphaBackground/base.png',
      ),
      diffFilename: path.join(
        __dirname,
        '__fixtures__/alphaBackground/diff_tmp.png',
      ),
    })

    expect(result.score).toBe(0)
    expect(result).toMatchSnapshot()
  })

  it('boxShadow', async () => {
    const result = await diffImages({
      actualFilename: path.join(
        __dirname,
        '__fixtures__/boxShadow/compare.png',
      ),
      expectedFilename: path.join(__dirname, '__fixtures__/boxShadow/base.png'),
      diffFilename: path.join(__dirname, '__fixtures__/boxShadow/diff_tmp.png'),
    })

    expect(result.score).toBe(0)
    expect(result).toMatchSnapshot()
  })

  it('border', async () => {
    const result = await diffImages({
      actualFilename: path.join(__dirname, '__fixtures__/border/compare.png'),
      expectedFilename: path.join(__dirname, '__fixtures__/border/base.png'),
      diffFilename: path.join(__dirname, '__fixtures__/border/diff_tmp.png'),
    })

    expect(result.score).toBe(0)
  })

  it('fontAliasing', async () => {
    const result = await diffImages({
      actualFilename: path.join(
        __dirname,
        '__fixtures__/fontAliasing/compare.png',
      ),
      expectedFilename: path.join(
        __dirname,
        '__fixtures__/fontAliasing/base.png',
      ),
      diffFilename: path.join(
        __dirname,
        '__fixtures__/fontAliasing/diff_tmp.png',
      ),
    })

    expect(result.score).toBeCloseTo(0, 2)
  })

  it('imageCompression', async () => {
    const result = await diffImages({
      actualFilename: path.join(
        __dirname,
        '__fixtures__/imageCompression/compare.png',
      ),
      expectedFilename: path.join(
        __dirname,
        '__fixtures__/imageCompression/base.png',
      ),
      diffFilename: path.join(
        __dirname,
        '__fixtures__/imageCompression/diff_tmp.png',
      ),
    })

    expect(result.score).toBe(0)
    expect(result).toMatchSnapshot()
  })

  it('imageCompression2', async () => {
    const result = await diffImages({
      actualFilename: path.join(
        __dirname,
        '__fixtures__/imageCompression2/compare.png',
      ),
      expectedFilename: path.join(
        __dirname,
        '__fixtures__/imageCompression2/base.png',
      ),
      diffFilename: path.join(
        __dirname,
        '__fixtures__/imageCompression2/diff_tmp.png',
      ),
    })

    expect(result).toMatchSnapshot()
  })

  it('imageCompression3', async () => {
    const result = await diffImages({
      actualFilename: path.join(
        __dirname,
        '__fixtures__/imageCompression3/compare.png',
      ),
      expectedFilename: path.join(
        __dirname,
        '__fixtures__/imageCompression3/base.png',
      ),
      diffFilename: path.join(
        __dirname,
        '__fixtures__/imageCompression3/diff_tmp.png',
      ),
    })

    expect(result.pixels).toBeCloseTo(35, -1)
    expect(result.score).toBeCloseTo(0, 3)
  })
})
