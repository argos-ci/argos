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
```

### Modifying your hosts

```
# Argos
127.0.0.1 www.argos-ci.dev api.argos-ci.dev
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

## Contributing

Changes and improvements are more than welcome!
Feel free to fork and open a pull request.
Please make your changes in a specific branch and request to pull into master!
