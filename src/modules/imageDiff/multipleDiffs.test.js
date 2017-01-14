import path from 'path';
import multipleDiffs from './multipleDiffs';

describe('multipleDiffs', () => {
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
    ]).then((manifest) => {
      expect(manifest).toEqual([
        { total: 1960.7, percentage: 0.0299183 },
        { total: 1960.7, percentage: 0.0299183 },
      ]);
    });
  });
});
