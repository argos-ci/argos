import { formatters } from 'express-err'
import express from 'express'
import { errorHandler } from '../middlewares/errorHandler'
import buckets from './buckets'
import builds from './builds'
import auth from './auth'
import webhooks from './webhooks'

const router = new express.Router()
export default router

router.use(buckets)
router.use(builds)
router.use(auth)
router.use(webhooks)

router.use(
  errorHandler({
    formatters: {
      json: formatters.json,
      default: formatters.json,
    },
  }),
)
