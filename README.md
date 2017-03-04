# Argos

> Stop discovering visual regressions

[![Build Status](https://travis-ci.org/argos-ci/argos.svg?branch=master)](https://travis-ci.org/argos-ci/argos)

**Forget about regressions**:
Argos will warn you if any visual regressions are introduced.
It comes with a Github integration.
It will notify you on pull requests when something might be broken.

**Save time**:
Argos compares screenshots at high speed.
You get a fast feedback.
You can review visual changes in one click as part of your code review process.

**Integrates in your development workflow**:
Argos integrates directly into your test suite and development workflow.
We provide a command line interface streamlining the process.

**Ship pixel-perfect interfaces**:
Argos provides different tools to compare screenshots.
Designers can easily participate in the code review process.

## The problem solved

- UI tests are **hard to write**.
- Automated testing can't tell you if something doesn't look right. UI **regressions** may go undetected.
- It's hard for **designers** to participate in the code review process.

## Install

```sh
brew install imagemagick graphicsmagick autoenv
nvm i
npm i -g yarn
yarn
```

### Setup your .env file

```
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
GITHUB_CLIENT_SECRET=
SERVER_SESSION_SECRET=
TEST_GITHUB_USER_ACCESS_TOKEN=
```

### Modifying your hosts

```
# Argos
127.0.0.1 www.argos-ci.dev
127.0.0.1 api.argos-ci.dev
```

### Set up database

```sh
yarn db:drop && yarn db:create && yarn db:load
```

### Use the seed

You can fill the database with some development data with the following command:
```sh
yarn db:truncate && yarn db:seed
```

## Develop

```sh
yarn dev # run server
yarn dev:review # run webpack
```

### Jobs

#### Recover pending or error jobs

1. Run console on heroku: `heroku run yarn run console`
2. Get all concerned objects (ex: `const builds = Build.query().whereNot({ jobStatus: 'complete' })`)
3. Add a job for these objects (ex: `builds.then(builds => builds.forEach(build => buildJob.push(build.id)))`)
4. Verify that jobs are correctly processed: `Build.query().whereNot({ jobStatus: 'complete' })`

### Migrations

#### Create a migration

```sh
knex migrate:make my_migration
```

#### Dump database

```sh
yarn db:dump
```

### Running the test suite

You can reset the test database using:
```sh
NODE_ENV=test yarn db:reset
```

## Previous work

- [happo](https://github.com/Galooshi/happo)
- [spectre](https://github.com/wearefriday/spectre)
- [wraith](https://github.com/BBC-News/wraith)
- [BackstopJS](https://github.com/garris/BackstopJS)
- [VisualReview-protractor](https://github.com/xebia/VisualReview-protractor)
- [Shoov](https://github.com/shoov/shoov)

## Contributing

Changes and improvements are more than welcome!
Feel free to fork and open a pull request.
Please make your changes in a specific branch and request to pull into master!
