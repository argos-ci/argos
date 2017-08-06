import path from 'path'
import tmp from 'tmp'
import S3 from 'aws-sdk/clients/s3'
import config from 'config'
import { promisify } from 'util'
import { readFile } from 'fs'
import upload from 'modules/s3/upload'
import download from './download'

const readFileAsync = promisify(readFile)

describe('download', () => {
  const s3 = new S3({ signatureVersion: 'v4' })
  let tmpDirectory

  beforeAll(() => {
    return upload({
      s3,
      Bucket: config.get('s3.screenshotsBucket'),
      Key: 'hello.txt',
      inputPath: path.join(__dirname, '__fixtures__', 'hello.txt'),
    })
  })

  beforeEach(() => {
    tmpDirectory = tmp.dirSync().name
  })

  it('should download a file from S3', async () => {
    const outputPath = path.join(tmpDirectory, 'hello.txt')
    await download({
      s3,
      outputPath,
      Bucket: config.get('s3.screenshotsBucket'),
      Key: 'hello.txt',
    })

    const file = await readFileAsync(outputPath, 'utf-8')
    expect(file).toEqual('hello!\n')
  })

  it('should correctly handle errors', async () => {
    const outputPath = path.join(tmpDirectory, 'hello.txt')
    let error

    try {
      await download({
        s3,
        outputPath,
        Bucket: config.get('s3.screenshotsBucket'),
        Key: 'hello-nop.txt',
      })
    } catch (e) {
      error = e
    }

    expect(error).not.toBe(undefined)
  })
})
