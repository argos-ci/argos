const workers = 3
const maxConnectionsAllowed = 20
const freeConnectionsForThirdTools = 2

const config = {
  development: {
    debug: true,
    client: 'postgresql',
    connection: {
      user: 'argos',
      database: 'development',
    },
    seeds: {
      directory: './seeds',
    },
  },
  test: {
    client: 'postgresql',
    connection: {
      user: 'argos',
      database: 'test',
    },
  },
  production: {
    client: 'postgresql',
    pool: {
      min: 2,
      max: Math.floor((maxConnectionsAllowed - freeConnectionsForThirdTools) / workers),
    },
  },
}

if (process.env.DATABASE_URL) {
  const url = require('url')
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
