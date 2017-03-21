import { transaction } from 'objection'
import errorHandler, { HttpError } from 'express-err'
import express from 'express'
import multer from 'multer'
import S3 from 'aws-sdk/clients/s3'
import multerS3 from 'multer-s3'
import config from 'config'
import baseCompare from 'modules/baseCompare/baseCompare'
import Build from 'server/models/Build'
import Repository from 'server/models/Repository'
import ScreenshotBucket from 'server/models/ScreenshotBucket'
import buildJob from 'server/jobs/build'

const router = new express.Router()
const s3 = new S3({
  signatureVersion: 'v4',
})
const upload = multer({
  storage: multerS3({
    s3,
    bucket: config.get('s3.screenshotsBucket'),
    contentType: multerS3.AUTO_CONTENT_TYPE,
  }),
})

/**
 * Takes a route handling function and returns
 * a function that wraps it in a `try/catch`. Caught
 * exceptions are forwarded to the `next` handler.
 */
function errorChecking(routeHandler) {
  return async (req, res, next) => {
    try {
      await routeHandler(req, res, next)
    } catch (err) {
      // Handle objection errors
      err.status = err.status || err.statusCode
      next(err)
    }
  }
}

router.post('/builds', upload.array('screenshots[]', 500), errorChecking(
  async (req, res) => {
    if (!req.body.token) {
      throw new HttpError(401, 'Invalid token')
    }

    const [repository] = await Repository.query().where({ token: req.body.token })

    if (!repository) {
      throw new HttpError(400, `Repository not found (token: "${req.body.token}")`)
    }
    if (!repository.enabled) {
      throw new HttpError(400, 'Repository not enabled')
    }

    const {
      user,
      compareCommitFound,
      baseScreenshotBucket,
    } = await baseCompare({
      baseCommit: 'master',
      compareCommit: req.body.commit,
      repository,
    })

    if (!user) {
      throw new HttpError(400, 'User not found')
    }
    if (!compareCommitFound) {
      throw new HttpError(400, 'Commit not found')
    }

    const build = await transaction(
      Build,
      ScreenshotBucket,
      async function (Build, ScreenshotBucket) {
        const bucket = await ScreenshotBucket
          .query()
          .insert({
            name: 'default',
            commit: req.body.commit,
            branch: req.body.branch,
            repositoryId: repository.id,
          })

        const inserts = req.files.map(file => bucket
          .$relatedQuery('screenshots')
          .insert({
            screenshotBucketId: bucket.id,
            name: file.originalname,
            s3Id: file.key,
          }))

        await Promise.all(inserts)

        const build = await Build.query()
          .insert({
            baseScreenshotBucketId: baseScreenshotBucket ? baseScreenshotBucket.id : null,
            compareScreenshotBucketId: bucket.id,
            repositoryId: repository.id,
            jobStatus: 'pending',
          })

        return build
      },
    )

    await buildJob.push(build.id)

    res.send(build)
  },
))

router.get('/buckets', errorChecking(
  async (req, res) => {
    let query = ScreenshotBucket.query()

    if (req.query.branch) {
      query = query.where({ branch: req.query.branch })
    }

    res.send(await query)
  },
))

// Display errors
router.use(errorHandler({
  exitOnUncaughtException: false,
  formatters: ['json'],
  defaultFormatter: 'json',
}))

export default router
