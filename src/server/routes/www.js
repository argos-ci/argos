import express from 'express'
import path from 'path'
import passport from 'passport'
import configurePassport from 'server/routes/configurePassport'
import session from 'express-session'
import connectRedis from 'connect-redis'
import config from 'config'
import * as redis from 'server/services/redis'
import graphqlMiddleware from 'server/graphql/middleware'
import rendering from 'server/middlewares/rendering'

const router = new express.Router()
const RedisStore = connectRedis(session)

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

router.use(session({
  secret: config.get('server.sessionSecret'),
  store: new RedisStore({ client: redis.connect() }),
  cookie: {
    secure: config.get('server.secure'),
    httpOnly: true,
    maxAge: 2592000000, // 30 days
  },
  // Touch is supported by the Redis store.
  // No need to resave, we can avoid concurrency issues.
  resave: false,
  saveUninitialized: false,
}))
router.use(passport.initialize())
router.use(passport.session())

configurePassport(passport)

// GraphQL
router.use('/graphql', graphqlMiddleware())

;['private', 'public'].forEach((type) => {
  router.get(`/auth/github-${type}`, passport.authenticate(`github-${type}`))
  router.get(
    `/auth/github/callback/${type}`,
    // Public and private strategies have the same authenticate behavior,
    // so we use public for both
    passport.authenticate(`github-${type}`, { failureRedirect: '/login' }),
    (req, res) => {
      // Successful authentication, redirect home.
      res.redirect('/')
    },
  )
})


router.get('/auth/logout', (req, res) => {
  req.logout()
  res.redirect('/')
})

router.get('*', rendering)

export default router
