import path from 'path'
import S3 from 'aws-sdk/clients/s3'
import config from 'config'
import upload from './upload'

describe('upload', () => {
  let s3

  beforeEach(() => {
    s3 = new S3({ signatureVersion: 'v4' })
  })

  it('should upload a file to S3', async () => {
    const inputPath = path.join(__dirname, '__fixtures__', 'screenshot_test.jpg')
    const data = await upload({
      s3,
      inputPath,
      Bucket: config.get('s3.screenshotsBucket'),
    })

    expect(data.Key).not.toBe(undefined)
  })
})
