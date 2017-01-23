import imageDiff from 'modules/imageDiff/imageDiff'

function multipleDiffs(diffs) {
  const results = diffs.map(diff => imageDiff(diff))
  return Promise.all(results)
}

export default multipleDiffs
