import path from 'path'
import { setTestsTimeout } from 'server/testUtils'
import multipleDiffs from './multipleDiffs'

describe('multipleDiffs', () => {
  setTestsTimeout(15000)

  it('should diff between several images and return the result', () => {
    return multipleDiffs([
      {
        actualImage: path.join(__dirname, '__fixtures__/YDN.png'),
        expectedImage: path.join(__dirname, '__fixtures__/YDN_Color.png'),
        diffImage: path.join(__dirname, '__fixtures__/YDN_Color_multipleDiff1_tmp.png'),
      },
      {
        actualImage: path.join(__dirname, '__fixtures__/YDN.png'),
        expectedImage: path.join(__dirname, '__fixtures__/YDN_Color.png'),
        diffImage: path.join(__dirname, '__fixtures__/YDN_Color_multipleDiff2_tmp.png'),
      },
    ]).then((results) => {
      // Avoid precision issues relative to Linux / macOS
      results[0].total = Math.round(results[0].total)
      results[1].total = Math.round(results[1].total)

      expect(results).toEqual([
        { total: 1961, percentage: 0.0299183 },
        { total: 1961, percentage: 0.0299183 },
      ])
    })
  })
})
