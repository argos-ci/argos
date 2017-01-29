import fs from 'mz/fs'
import uuid from 'uuid/v4'

function upload({
  s3,
  bucket,
  inputPath,
}) {
  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(inputPath)
    readStream.on('error', reject)
    s3.upload({
      Bucket: bucket,
      Body: readStream,
      Key: uuid(),
    }, (err, data) => {
      if (err) {
        reject(err)
      } else {
        resolve(data)
      }
    })
  })
}

export default upload
