import * as Sentry from '@sentry/node'
import { Strategy as GithubStrategy } from 'passport-github'
import config from '@argos-ci/config'
import { User } from '@argos-ci/database/models'
import { syncFromUserId } from '@argos-ci/synchronize'
import {
  PUBLIC_SCOPES,
  PRIVATE_SCOPES,
  getUserAuthorizationState,
} from './authorizations'

function getDataFromProfile(profile) {
  return {
    githubId: Number(profile.id),
    login: profile.username,
    name: profile.displayName,
    email: profile.emails.find(email => email.primary).value,
  }
}

export function configurePassport(passport) {
  const types = ['private', 'public']
  types.forEach(type => {
    passport.use(
      `github-${type}`,
      new GithubStrategy(
        {
          clientID: config.get('github.clientId'),
          clientSecret: config.get('github.clientSecret'),
          callbackURL: `${config.get(
            'server.url',
          )}/auth/github/callback/${type}`,
          scope: type === 'private' ? PRIVATE_SCOPES : PUBLIC_SCOPES,
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            let user = await User.query()
              .where({ githubId: Number(profile.id) })
              .limit(1)
              .first()

            if (user) {
              const privateSync = user.privateSync || type === 'private'
              const authorizationState = await getUserAuthorizationState({
                accessToken,
                previousAccessToken: user.accessToken,
                privateSync,
              })
              user = await user.$query().patchAndFetch({
                ...authorizationState,
                privateSync,
                ...getDataFromProfile(profile),
              })
            } else {
              const privateSync = type === 'private'
              const authorizationState = await getUserAuthorizationState({
                accessToken,
                privateSync,
              })
              user = await User.query().insert({
                ...authorizationState,
                privateSync,
                ...getDataFromProfile(profile),
              })
            }

            syncFromUserId(user.id)

            done(null, user)
          } catch (err) {
            Sentry.captureException(err)
            done(err)
          }
        },
      ),
    )
  })

  passport.serializeUser((user, done) => done(null, user.id))
  passport.deserializeUser(async (id, done) => {
    try {
      done(null, await User.query().findById(id))
    } catch (err) {
      Sentry.captureException(err)
      done(err)
    }
  })
}
