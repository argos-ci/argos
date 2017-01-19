import imageDiffRaw from 'image-diff'

function imageDiff({ actualImage, expectedImage, diffImage }) {
  return new Promise((resolve, reject) => {
    imageDiffRaw.getFullResult({
      actualImage,
      expectedImage,
      diffImage,
    }, (error, result) => {
      if (error) {
        reject(error)
      } else {
        resolve(result)
      }
    })
  })
}

export default imageDiff
