import { createWriteStream } from 'fs'

function download({ s3, bucket, fileKey, outputPath }) {
  return new Promise((resolve, reject) => {
    const readStream = s3
      .getObject({
        Bucket: bucket,
        Key: fileKey,
      })
      .createReadStream()
    const writeStream = createWriteStream(outputPath)
    writeStream.on('finish', resolve)
    readStream.on('error', reject)
    writeStream.on('error', reject)
    readStream.pipe(writeStream)
  })
}

export default download
