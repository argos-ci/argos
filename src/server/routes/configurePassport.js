import { Strategy } from 'passport-github'
import User from 'server/models/User'
import config from 'config'

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
        .where({
          githubId: profile.id,
        })

      if (!users[0]) {
        const user = await User
          .query()
          .insert({
            githubId: profile.id,
            name: profile.displayName,
            email: profile.emails.find(email => email.primary).value,
          })

        done(null, user)
      } else {
        done(null, users[0])
      }
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
