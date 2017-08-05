import { createReadStream } from 'fs'
import uuid from 'uuid/v4'
import mime from 'mime'

function upload({ s3, bucket, inputPath }) {
  return new Promise((resolve, reject) => {
    const readStream = createReadStream(inputPath)
    readStream.on('error', reject)
    s3.upload(
      {
        Bucket: bucket,
        Body: readStream,
        ContentType: mime.lookup(inputPath),
        Key: uuid(),
      },
      (err, data) => {
        if (err) {
          reject(err)
        } else {
          resolve(data)
        }
      }
    )
  })
}

export default upload
