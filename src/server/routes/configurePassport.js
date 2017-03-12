import { Strategy as GithubStrategy } from 'passport-github'
import User from 'server/models/User'
import config from 'config'
import syncFromUserId from 'modules/synchronizer/syncFromUserId'

function getDataFromProfile(profile) {
  return {
    githubId: Number(profile.id),
    login: profile.username,
    name: profile.displayName,
    email: profile.emails.find(email => email.primary).value,
  }
}

export default (passport) => {
  ['private', 'public'].forEach((type) => {
    passport.use(`github-${type}`, new GithubStrategy({
      clientID: config.get('github.clientId'),
      clientSecret: config.get('github.clientSecret'),
      callbackURL: `${config.get('server.url')}/auth/github/callback/${type}`,
      // https://developer.github.com/v3/oauth/#scopes
      scope: [
        'user:email',
        'repo:status',
        'read:org',
        ...(type === 'private' ? ['repo'] : []),
      ],
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        let [user] = await User.query().where({ githubId: Number(profile.id) })

        user = user ?
          await User.query().patchAndFetchById(user.id, {
            accessToken,
            privateSync: user.privateSync || type === 'private',
            ...getDataFromProfile(profile),
          }) :
          await User.query().insert({
            accessToken,
            privateSync: type === 'private',
            ...getDataFromProfile(profile),
          })

        syncFromUserId(user.id)

        done(null, user)
      } catch (err) {
        done(err)
      }
    }))
  })

  passport.serializeUser((user, done) => done(null, user.id))
  passport.deserializeUser(async (id, done) => {
    try {
      done(null, await User.query().findById(id))
    } catch (err) {
      done(err)
    }
  })
}
