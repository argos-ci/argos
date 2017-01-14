import path from 'path';
import generateManifest from './generateManifest';

describe('generateManifest', () => {
  it('should generate a manifest from files', () => {
    return generateManifest({
      actualImagesPath: path.join(__dirname, '__fixtures__/actual'),
      expectedImagesPath: path.join(__dirname, '__fixtures__/expected'),
      diffImagesPath: path.join(__dirname, '__fixtures__/diff'),
    }).then((manifest) => {
      // Avoid precision issues relative to Linux / macOS
      manifest[0].total = Math.round(manifest[0].total);

      expect(manifest).toEqual([
        { total: 1961, percentage: 0.0299183 },
      ]);
    });
  });
});
