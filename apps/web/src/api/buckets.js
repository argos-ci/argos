import express from 'express'
import { ScreenshotBucket } from '@argos-ci/database/models'
import { asyncHandler } from '../util'

const router = new express.Router()
export default router

router.get(
  '/buckets',
  asyncHandler(async (req, res) => {
    let query = ScreenshotBucket.query()

    if (req.query.branch) {
      query = query.where({ branch: req.query.branch })
    }

    res.send(await query)
  }),
)
