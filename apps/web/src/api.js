import { transaction, raw } from '@argos-ci/database'
import { HttpError, formatters } from 'express-err'
import express from 'express'
import multer from 'multer'
import multerS3 from 'multer-s3'
import bodyParser from 'body-parser'
import config from '@argos-ci/config'
import { Build, Repository, ScreenshotBucket } from '@argos-ci/database/models'
import { job as buildJob } from '@argos-ci/build'
import { s3 as getS3 } from '@argos-ci/storage'
import { getRedisLock } from './redis'
import { errorHandler } from './middlewares/errorHandler'

const router = new express.Router()

const upload = multer({
  storage: multerS3({
    s3: getS3(),
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

async function createBuild({
  Build,
  ScreenshotBucket,
  data,
  repository,
  complete = true,
}) {
  const bucket = await ScreenshotBucket.query().insertAndFetch({
    name: 'default',
    commit: data.commit,
    branch: data.branch,
    repositoryId: repository.id,
    complete,
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
    .withGraphFetched('compareScreenshotBucket')
    .findOne({
      'builds.repositoryId': repository.id,
      externalId: data.externalBuildId,
    })

  // @TODO Throw an error if batchCount is superior to expected

  if (build) {
    await build.$query().patch({ batchCount: raw('"batchCount" + 1') })
    return build
  }

  return createBuild({
    Build,
    ScreenshotBucket,
    data,
    repository,
    complete: false,
  })
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
    const lock = getRedisLock()

    async function task() {
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

          if (build.jobStatus === 'aborted') {
            throw new HttpError(400, 'Build is aborted')
          }

          await build.compareScreenshotBucket
            .$relatedQuery('screenshots')
            .insert(
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

      const buildUrl = await build.getUrl()

      if (!data.batchCount || Number(data.batchCount) === build.batchCount) {
        await build
          .$relatedQuery('compareScreenshotBucket')
          .patch({ complete: true })
        await buildJob.push(build.id)
      }

      res.send({
        build: {
          ...build,
          repository: undefined,
          buildUrl,
        },
      })
    }

    const lockName = [data.token, data.commit, data.externalBuildId]
      .filter(Boolean)
      .join('-')
    await lock(lockName, task)
  }),
)

router.post(
  '/cancel-build',
  bodyParser.json(),
  errorChecking(async (req, res) => {
    if (!req.body.token) {
      throw new HttpError(401, 'Missing token')
    }

    if (!req.body.externalBuildId) {
      throw new HttpError(401, 'Missing externalBuildId')
    }

    const repository = await Repository.query()
      .where({ token: req.body.token })
      .limit(1)
      .first()

    if (!repository) {
      throw new HttpError(
        400,
        `Repository not found (token: "${req.body.token}")`,
      )
    }

    if (!repository.enabled) {
      throw new HttpError(
        400,
        `Repository not enabled (name: "${repository.name}")`,
      )
    }

    const build = await transaction(Build, async Build => {
      const build = await Build.query().findOne({
        'builds.repositoryId': repository.id,
        externalId: req.body.externalBuildId,
      })

      if (!build) return null

      await build.$query().patch({ jobStatus: 'aborted' })

      return build
    })

    res.send({ build })
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
