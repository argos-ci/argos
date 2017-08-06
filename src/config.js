import path from 'path'
import convict from 'convict'

const config = convict({
  env: {
    doc: 'The application environment',
    format: ['production', 'development', 'test'],
    default: 'development',
    env: 'NODE_ENV',
  },
  googleAnalytics: {
    doc: 'The tracking id',
    default: 'UA-89989315-2',
  },
  api: {
    subdomain: {
      format: String,
      default: 'api.dev',
    },
  },
  www: {
    subdomain: {
      format: String,
      default: 'www.dev',
    },
  },
  server: {
    port: {
      doc: 'The server port number',
      format: 'port',
      default: 4001,
      env: 'PORT',
    },
    logFormat: {
      doc: 'The morgan log format to use',
      format: ['dev', 'combined', 'common', 'short', 'tiny', ''],
      default: 'dev',
    },
    url: {
      doc: 'The user public url',
      format: String,
      default: 'http://www.dev.argos-ci.com:4002',
    },
    sessionSecret: {
      doc: 'This is the secret used to sign the session ID cookie.',
      format: String,
      default: 'keyboard cat',
      env: 'SERVER_SESSION_SECRET',
    },
    secure: {
      doc: 'Specify if the server is using https or not.',
      format: Boolean,
      default: false,
    },
  },
  client: {
    port: {
      doc: 'The client port number',
      format: 'port',
      default: 4002,
    },
  },
  amqp: {
    url: {
      doc: 'RabbitMQ url',
      format: String,
      default: 'amqp://localhost',
      env: 'CLOUDAMQP_URL',
    },
  },
  s3: {
    screenshotsBucket: {
      doc: 'Bucket containing screenshots',
      format: String,
      default: 'argos-screenshots-dev',
      env: 'AWS_SCREENSHOTS_BUCKET',
    },
  },
  github: {
    clientId: {
      doc: 'Client ID',
      format: String,
      default: 'c4636449f2df59e6010d',
    },
    clientSecret: {
      doc: 'Client Secret',
      format: String,
      default: '1781c9a3e1d57fdcfdf9c29c02abf7d37e1c0427',
      env: 'GITHUB_CLIENT_SECRET',
    },
    applicationUrl: {
      format: String,
      default: 'https://github.com/settings/connections/applications/8460535e1d4c40dfdf05',
    },
  },
  redis: {
    url: {
      doc: 'Redis url',
      format: String,
      default: 'redis://localhost:6379/1',
      env: 'REDIS_URL',
    },
  },
  releaseVersion: {
    doc: 'Heroku release version',
    format: String,
    default: 'dev',
    env: 'HEROKU_RELEASE_VERSION',
  },
})

const env = config.get('env')
config.loadFile(path.join(__dirname, `../config/${env}.json`))
config.validate()

export default config
