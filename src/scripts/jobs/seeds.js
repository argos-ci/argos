import 'server/bootstrap/setup'
// --- Post bootstrap -----
import { promisify } from 'util'
import config from 'config'
import S3 from 'aws-sdk/clients/s3'
import display from 'modules/scripts/display'
import path from 'path'
import { readdir } from 'fs'
import upload from 'modules/s3/upload'
import factory from 'server/test/factory'

display.info('Start script')

const SCREENSHOTS_SEEDS_DIRECTORY = path.join(__dirname, '../../../screenshots/seeds')
const readdirAsync = promisify(readdir)

async function uploadSeedToS3() {
  const s3 = new S3({ signatureVersion: 'v4' })

  let images = await readdirAsync(SCREENSHOTS_SEEDS_DIRECTORY)
  images = images.filter(image => image.match(/\.png$/))
  for (let i = 0; i < images.length; i += 1) {
    const image = images[i]
    display.info(`uploading ${image} to ${config.get('s3.screenshotsBucket')}`)
    await upload({
      s3,
      Key: image,
      Bucket: config.get('s3.screenshotsBucket'),
      inputPath: path.join(SCREENSHOTS_SEEDS_DIRECTORY, image),
    })
  }
}

async function run() {
  await uploadSeedToS3()

  const ScreenshotBucket1 = await factory.create('ScreenshotBucket', {
    branch: 'master',
    repositoryId: '1',
  })
  await factory.create('Screenshot', {
    name: '',
    s3Id: '',
    screenshotBucketId: ScreenshotBucket1.id,
  })
}

run()
