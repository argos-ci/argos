import path from 'path'
import tmp from 'tmp'
import S3 from 'aws-sdk/clients/s3'
import { promisify } from 'util'
import { readFile } from 'fs'
import download from './download'

const readFileAsync = promisify(readFile)

describe('download', () => {
  let s3
  let tmpDirectory

  beforeEach(() => {
    s3 = new S3({ signatureVersion: 'v4' })
    ;({ name: tmpDirectory } = tmp.dirSync())
  })

  it('should download a file from S3', async () => {
    const outputPath = path.join(tmpDirectory, 'hello.txt')
    await download({
      s3,
      bucket: 'argos-screenshots-sandbox',
      fileKey: 'hello.txt',
      outputPath,
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
        bucket: 'argos-screenshots-sandbox',
        fileKey: 'hello-nop.txt',
        outputPath,
      })
    } catch (e) {
      error = e
    }

    expect(error).not.toBe(undefined)
  })
})
