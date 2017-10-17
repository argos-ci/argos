const url = require('url')

const workers = 3
const maxConnectionsAllowed = 20
const freeConnectionsForThirdTools = 2

const configDefault = {
  migrations: {
    directory: 'src/server/migrations',
  },
  seeds: {
    directory: 'src/server/seeds',
  },
}

const config = {
  development: Object.assign({}, configDefault, {
    debug: true,
    client: 'postgresql',
    connection: {
      user: 'argos',
      database: 'development',
    },
  }),
  test: Object.assign({}, configDefault, {
    debug: false,
    client: 'postgresql',
    connection: {
      user: 'argos',
      database: 'test',
    },
  }),
  production: Object.assign({}, configDefault, {
    debug: false,
    client: 'postgresql',
    pool: {
      min: 2,
      max: Math.floor((maxConnectionsAllowed - freeConnectionsForThirdTools) / workers),
    },
  }),
}

if (process.env.DATABASE_URL) {
  const pgProd = url.parse(process.env.DATABASE_URL)

  config.production.connection = {
    host: pgProd.hostname,
    port: pgProd.port,
    user: pgProd.auth.split(':')[0],
    password: pgProd.auth.split(':')[1],
    database: pgProd.path.substring(1),
    ssl: true,
  }
}

module.exports = config
