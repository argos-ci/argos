import { transaction, raw } from 'objection'
import { HttpError, formatters } from 'express-err'
import express from 'express'
import multer from 'multer'
import S3 from 'aws-sdk/clients/s3'
import multerS3 from 'multer-s3'
import config from 'config'
import { formatUrlFromBuild } from 'modules/urls/buildUrl'
import Build from 'server/models/Build'
import Repository from 'server/models/Repository'
import ScreenshotBucket from 'server/models/ScreenshotBucket'
import buildJob from 'server/jobs/build'
import errorHandler from 'server/middlewares/errorHandler'

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
export function errorChecking(routeHandler) {
  return async (req, res, next) => {
    try {
      await routeHandler(req, res, next)
    } catch (err) {
      // Handle objection errors
      const candidates = [err.status, err.statusCode, err.code, 500]
      err.status = candidates.find(Number.isInteger)
      next(err)
    }
  }
}

async function createBuild({ Build, ScreenshotBucket, data, repository }) {
  const bucket = await ScreenshotBucket.query().insertAndFetch({
    name: 'default',
    commit: data.commit,
    branch: data.branch,
    repositoryId: repository.id,
  })

  const build = await Build.query().insertAndFetch({
    baseScreenshotBucketId: null,
    compareScreenshotBucketId: bucket.id,
    repositoryId: repository.id,
    jobStatus: 'pending',
    externalId: data.externalBuildId || null,
    batchCount: data.batchCount ? 1 : null,
  })

  build.compareScreenshotBucket = bucket

  return build
}

async function useExistingBuild({ Build, ScreenshotBucket, data, repository }) {
  const build = await Build.query()
    .eager('compareScreenshotBucket')
    .findOne({
      'builds.repositoryId': repository.id,
      externalId: data.externalBuildId,
    })

  // @TODO Throw an error if batchCount is superior to expected

  if (build) {
    await build.$query().patch({ batchCount: raw('"batchCount" + 1') })
    return build
  }

  return createBuild({ Build, ScreenshotBucket, data, repository })
}

router.post(
  '/builds',
  upload.array('screenshots[]', 500),
  errorChecking(async (req, res) => {
    const data = JSON.parse(req.body.data)

    if (!data.token) {
      throw new HttpError(401, 'Missing token')
    }

    if (!data.commit) {
      throw new HttpError(401, 'Missing commit')
    }

    const repository = await Repository.query()
      .where({ token: data.token })
      .limit(1)
      .first()

    if (!repository) {
      throw new HttpError(400, `Repository not found (token: "${data.token}")`)
    }

    if (!repository.enabled) {
      throw new HttpError(
        400,
        `Repository not enabled (name: "${repository.name}")`,
      )
    }

    const strategy = data.externalBuildId ? useExistingBuild : createBuild

    let build = await transaction(
      Build,
      ScreenshotBucket,
      async (Build, ScreenshotBucket) => {
        const build = await strategy({
          Build,
          ScreenshotBucket,
          data,
          repository,
        })

        await build.compareScreenshotBucket.$relatedQuery('screenshots').insert(
          req.files.map((file, index) => ({
            screenshotBucketId: build.compareScreenshotBucket.id,
            name: data.names[index],
            s3Id: file.key,
          })),
        )

        return build
      },
    )

    // So we don't reuse the previous transaction
    build = await Build.query().findById(build.id)

    const buildUrl = await formatUrlFromBuild(build)

    if (!data.batchCount || Number(data.batchCount) === build.batchCount) {
      await buildJob.push(build.id)
    }

    res.send({
      build: {
        ...build,
        repository: undefined,
        buildUrl,
      },
    })
  }),
)

router.get(
  '/buckets',
  errorChecking(async (req, res) => {
    let query = ScreenshotBucket.query()

    if (req.query.branch) {
      query = query.where({ branch: req.query.branch })
    }

    res.send(await query)
  }),
)

router.use(
  errorHandler({
    formatters: {
      json: formatters.json,
      default: formatters.json,
    },
  }),
)

export default router
