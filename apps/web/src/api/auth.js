import { Router } from 'express'
import axios from 'axios'
import bodyParser from 'body-parser'
import cors from 'cors'
import { getTokenOctokit } from '@argos-ci/github'
import { User } from '@argos-ci/database/models'
import config from '@argos-ci/config'
import { synchronizeFromUserId } from '@argos-ci/synchronize'
import { asyncHandler } from '../util'

const router = new Router()

export default router

const url = new URL(config.get('server.url'))
router.use(
  cors({
    origin: `${url.protocol}//${url.hostname}:${url.port}`,
    methods: ['POST'],
  }),
)

function getDataFromProfile(profile) {
  return {
    githubId: profile.id,
    login: profile.login,
    name: profile.name,
    email: profile.email,
  }
}

async function registerUserFromGitHub(accessToken) {
  const octokit = getTokenOctokit(accessToken)

  const profile = await octokit.users.getAuthenticated()
  const userData = { ...getDataFromProfile(profile.data), accessToken }

  let user = await User.query()
    .where({ githubId: userData.githubId })
    .limit(1)
    .first()

  if (user) {
    await user.$query().patch(userData)
  } else {
    user = await User.query().insertAndFetch(userData)
  }

  await synchronizeFromUserId(user.id)
}

router.post(
  '/auth/github',
  bodyParser.json(),
  asyncHandler(async (req, res) => {
    const result = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: config.get('github.clientId'),
        client_secret: config.get('github.clientSecret'),
        code: req.body.code,
      },
      {
        headers: {
          accept: 'application/json',
        },
      },
    )

    if (result.data.error) {
      res.status(400)
      res.send(result.data)
      return
    }

    await registerUserFromGitHub(result.data.access_token)
    res.send(result.data)
  }),
)
