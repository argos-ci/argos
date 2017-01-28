import { transaction } from 'objection'
import ScreenshotBucket from 'server/models/ScreenshotBucket'
import express from 'express'
import S3 from 'aws-sdk/clients/s3'
import multer from 'multer'
import multerS3 from 'multer-s3'
import config from 'config'

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
      err.status = err.statusCode
      next(err)
    }
  }
}

router.post('/buckets', upload.array('screenshots[]', 50), errorChecking(
  async (req, res) => {
    const bucket = await transaction(ScreenshotBucket, async function (ScreenshotBucket) {
      const bucket = await ScreenshotBucket
        .query()
        .insert({
          name: req.body.name,
          commit: req.body.commit,
          branch: req.body.branch,
        })

      const inserts = req.files.map(file => bucket
        .$relatedQuery('screenshots')
        .insert({
          name: file.originalname,
          s3Id: file.key,
        }))

      await Promise.all(inserts)

      return bucket
    })

    res.send(bucket)
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

export default router
