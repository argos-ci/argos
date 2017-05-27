import fs from 'mz/fs'

function download({ s3, bucket, fileKey, outputPath }) {
  return new Promise((resolve, reject) => {
    const readStream = s3
      .getObject({
        Bucket: bucket,
        Key: fileKey,
      })
      .createReadStream()
    const writeStream = fs.createWriteStream(outputPath)
    writeStream.on('finish', resolve)
    readStream.on('error', reject)
    writeStream.on('error', reject)
    readStream.pipe(writeStream)
  })
}

export default download
