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

// GraphQL
router.use('/graphql', graphqlMiddleware())

router.use(session({
  secret: config.get('server.sessionSecret'),
  store: new RedisStore({ client: redis.connect() }),
  cookie: {
    secure: false, // To activate once we do HTTPS.
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

router.get('/auth/github',
  passport.authenticate('github'),
  () => {
    // The request will be redirected to GitHub for authentication.
  },
)

router.get('/auth/github/callback',
  passport.authenticate('github', {
    failureRedirect: '/login',
  }),
  (req, res) => {
    // Successful authentication, redirect home.
    res.redirect('/')
  },
)

router.get('/auth/logout', (req, res) => {
  req.logout()
  res.redirect('/')
})

router.get('*', rendering)

export default router
