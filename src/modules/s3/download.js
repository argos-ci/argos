import { createWriteStream } from 'fs'

function download({ s3, outputPath, ...other }) {
  return new Promise((resolve, reject) => {
    const readStream = s3.getObject(other).createReadStream()

    const writeStream = createWriteStream(outputPath)
    writeStream.on('finish', resolve)
    readStream.on('error', reject)
    writeStream.on('error', reject)
    readStream.pipe(writeStream)
  })
}

export default download
