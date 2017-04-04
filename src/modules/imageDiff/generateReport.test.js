import path from 'path'
import generateReport from './generateReport'

describe('generateReport', () => {
  it('should generate a report from files', () => (
    generateReport({
      compareScreenshotsPath: path.join(__dirname, '__fixtures__/actual'),
      baseScreenshotsPath: path.join(__dirname, '__fixtures__/expected'),
      diffResultsPath: path.join(__dirname, '__fixtures__/diff'),
    }).then((manifest) => {
      // Avoid precision issues relative to Linux / macOS
      manifest[0].total = Math.round(manifest[0].total)

      expect(manifest).toEqual([
        { total: 1961, percentage: 0.0299183 },
      ])
    })
  ))
})
