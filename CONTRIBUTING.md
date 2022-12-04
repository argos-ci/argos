# Contributing

If you're reading this, you're awesome!
Thank you for helping us make this project great and being a part of the argos community. Here are a few guidelines that will help you along the way.

## Opening an Issue

If you think you have found a bug, or have a new feature idea, please start by making sure it hasn't already been [reported or fixed](https://github.com/argos-ci/argos/issues?utf8=%E2%9C%93&q=is%3Aopen+is%3Aclosed).
You can search through existing issues and PRs to see if someone has reported one similar to yours.

Next, create a new issue that briefly explains the problem, and provides a bit of background as to the circumstances that triggered it, and steps to reproduce it.

## Issue Guidelines

Please don't group multiple topics into one issue, but instead each should be its own issue.

And please don't just '+1' an issue. It spams the maintainers and doesn't help move the issue forward.

## Submitting a Pull Request

Argos CI is a community project, so pull requests are always welcome, but before working on a large change, it is best to open an issue first to discuss it with the maintainers.

When in doubt, keep your pull requests small.
To give a PR the best chance of getting accepted, don't bundle more than one feature or bug fix per pull request.
It's always best to create two smaller PRs than one big one.

When adding new features or modifying existing code, please attempt to include tests to confirm the new behaviour.

## Branch Structure

All stable releases are tagged ([view tags](https://github.com/argos-ci/argos/tags)).
At any given time, `master` represents the latest development version of the library.

## Getting started

Please create a new branch from an up to date master on your fork. (Note, urgent hotfixes should be branched off the latest stable release rather than master)

1. Fork the argos repository on Github
2. Clone your fork to your local machine `git clone --depth 1 git@github.com:<yourname>/argos.git`
3. Create a branch `git checkout -b my-topic-branch`
4. Make your changes, lint, then push to github with `git push --set-upstream origin my-topic-branch`.
5. Visit github and make your pull request.

If you have an existing local repository, please update it before you start, to minimise the chance of merge conflicts.

```js
git remote add upstream git@github.com:argos-ci/argos.git
git checkout master
git pull upstream master
git checkout -b my-topic-branch
npm install
```

## Install

```sh
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.2/install.sh | bash
brew install imagemagick@6 graphicsmagick autoenv watchman
nvm install
nvm alias default "$(cat .nvmrc)"
```

### Setup your .env file

```
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_SCREENSHOTS_BUCKET=
GITHUB_CLIENT_SECRET=
GITHUB_CLIENT_ID=
TEST_GITHUB_USER_ACCESS_TOKEN=
```

### Modifying your hosts

```
# Argos
127.0.0.1 app.argos-ci.dev
127.0.0.1 api.argos-ci.dev
```

### Setup SSL

Install [mkcert](https://github.com/FiloSottile/mkcert) and type the following command:

```
mkcert -install
mkcert "*.argos-ci.dev"
```

Two files should be generated at the root of the project.

### Set up database

```sh
docker-compose up -d
npm run setup
```

### Use the seed

You can fill the database with some development data with the following command:

```sh
npm run -w @argos-ci/database db:truncate && npm run -w @argos-ci/database db:seed
```

## Develop

```sh
npm run procfile
npm run dev
```

## Run E2E locally

Install playwright:

```
npx playwright install --with-deps
```

Run E2E setup:

```
npm run e2e:setup
```

Run E2E in debug mode:

```
npm run e2e:start -- --debug
```

### Jobs

### Migrations

#### Create a migration

```sh
npm run -w @argos-ci/database db:migrate:make my_migration
```

#### Dump database

```sh
npm run -w @argos-ci/database db:dump
```

#### Execute the latest migration

```sh
npm run -w @argos-ci/database  db:migrate:latest
```

### Running the test suite

You can reset the test database using:

```sh
NODE_ENV=test npm run -w @argos-ci/database db:reset
```

## Coding style

Please follow the coding style of the current code base. argos uses eslint, so if possible, enable linting in your editor to get realtime feedback.
Linting can be run manually with `npm run lint`.

Finally, when you submit a pull request, linting is run again by Continuous Integration testing, but hopefully by then your code is already clean!

## Roadmap

To get a sense of where argos is heading, or for ideas on where you could contribute, take a look at the opened issues.

## License

By contributing your code to the argos-ci/argos GitHub repository, you agree to license your contribution under the MIT license.
