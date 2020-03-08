import S3 from 'aws-sdk/clients/s3'

let s3

export function getS3Client() {
  if (!s3) {
    s3 = new S3({ signatureVersion: 'v4', region: 'eu-west-1' })
  }
  return s3
}
