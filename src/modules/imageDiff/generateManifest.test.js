import path from 'path';
import generateManifest from './generateManifest';

describe('generateManifest', () => {
  it('should generate a manifest from files', () => {
    return generateManifest({
      actualImagesPath: path.join(__dirname, '__fixtures__/actual'),
      expectedImagesPath: path.join(__dirname, '__fixtures__/expected'),
      diffImagesPath: path.join(__dirname, '__fixtures__/diff'),
    }).then((manifest) => {
      expect(manifest).toEqual([
        { total: 1960.7, percentage: 0.0299183 },
      ]);
    });
  });
});
