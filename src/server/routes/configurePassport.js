import { Strategy } from 'passport-github'
import User from 'server/models/User'
import config from 'config'
import syncFromUserId from 'modules/synchronizer/syncFromUserId'

function getDataFromProfile(profile) {
  return {
    name: profile.displayName,
    email: profile.emails.find(email => email.primary).value,
  }
}

export default (passport) => {
  passport.use(new Strategy({
    clientID: config.get('github.clientId'),
    clientSecret: config.get('github.clientSecret'),
    callbackURL: `${config.get('server.url')}/auth/github/callback`,
    // https://developer.github.com/v3/oauth/#scopes
    scope: ['user:email', 'repo:status', 'read:org'],
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const users = await User
        .query()
        .where({ githubId: Number(profile.id) })

      let user = users[0]

      if (!user) {
        user = await User
          .query()
          .insert({
            githubId: Number(profile.id),
            accessToken,
            login: profile.username,
            ...getDataFromProfile(profile),
          })
      } else {
        user = await User
          .query()
          .patchAndFetchById(user.id, { accessToken, ...getDataFromProfile(profile) })
      }

      syncFromUserId(user.id)

      done(null, user)
    } catch (err) {
      done(err)
    }
  }))

  passport.serializeUser((user, done) => {
    done(null, user.id)
  })

  passport.deserializeUser(async (id, done) => {
    try {
      const users = await User
        .query()
        .where({ id })

      done(null, users[0])
    } catch (err) {
      done(err)
    }
  })
}
