import { createReadStream } from 'fs'
import { v4 as uuid } from 'uuid'
import mime from 'mime'

function upload({ s3, inputPath, ...other }) {
  return s3
    .upload({
      Body: createReadStream(inputPath),
      ContentType: mime.getType(inputPath),
      Key: uuid(),
      ...other,
    })
    .promise()
}

export default upload
