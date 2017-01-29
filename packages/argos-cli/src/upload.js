import fs from 'mz/fs'
import path from 'path'
import fetch from 'node-fetch'
import FormData from 'form-data'
import config from './config'

export class UploadError extends Error {}

async function upload(directory, token) {
  if (!config.get('branch')) {
    throw new UploadError('Branch missing: use ARGOS_BRANCH to specify it.')
  }

  if (!config.get('commit')) {
    throw new UploadError('Commit missing: use ARGOS_COMMIT to specify it.')
  }

  const screenshots = await fs.readdir(directory)

  const body = screenshots.reduce((body, screenshot) => {
    body.append('screenshots[]', fs.createReadStream(path.join(directory, screenshot)))
    return body
  }, new FormData())

  body.append('branch', config.get('branch'))
  body.append('commit', config.get('commit'))
  body.append('token', token)

  return fetch(`${config.get('endpoint')}/builds`, { method: 'POST', body })
}

export default upload
