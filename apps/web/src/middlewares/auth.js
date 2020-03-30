import { User } from '@argos-ci/database/models'

function bearerToken(req, res, next) {
  req.token = null

  if (!req.headers || !req.headers.authorization) {
    next()
    return
  }

  const parts = req.headers.authorization.split(' ')
  if (parts.length === 2 && parts[0] === 'Bearer') {
    ;[, req.token] = parts
  }

  next()
}

function loggedUser(req, res, next) {
  req.user = null

  if (!req.token) {
    next()
    return
  }

  User.query()
    .where({ accessToken: req.token })
    .first()
    .then((user) => {
      req.user = user
      next()
    })
    .catch(next)
}

export const auth = [bearerToken, loggedUser]
