import { createReadStream } from 'fs'
import uuid from 'uuid/v4'
import mime from 'mime'

function upload({ s3, inputPath, ...other }) {
  return s3
    .upload({
      Body: createReadStream(inputPath),
      ContentType: mime.lookup(inputPath),
      Key: uuid(),
      ...other,
    })
    .promise()
}

export default upload
