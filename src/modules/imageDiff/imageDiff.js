import imageDiffRaw from 'image-diff'

function imageDiff(diff) {
  const {
    actualImage,
    expectedImage,
    diffImage,
  } = diff

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
