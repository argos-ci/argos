import imageDiff from './imageDiff';

async function multipleDiffs(diffs) {
  const results = [];
  for (const diff of diffs) {
    results.push(await imageDiff(diff));
  }
  return results;
}

export default multipleDiffs;
