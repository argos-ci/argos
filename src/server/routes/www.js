import express from 'express'
import path from 'path'
import graphqlMiddleware from 'server/graphql/middleware'
import rendering from 'server/middlewares/rendering'

const router = new express.Router()

// Public directory
router.use(express.static(path.join(__dirname, '../../../server/public'), {
  etag: true,
  lastModified: false,
  setHeaders: (res) => {
    res.set('Cache-Control', 'no-cache')
  },
}))

// Static directory
router.use('/static', express.static(path.join(__dirname, '../../../server/static'), {
  etag: true,
  lastModified: false,
  maxAge: '1 year',
  index: false,
}))

// GraphQL
router.use('/graphql', graphqlMiddleware())

router.get('*', rendering)

export default router
