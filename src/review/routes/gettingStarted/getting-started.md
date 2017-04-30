This is a quick getting started guide.

## Installation

### Install the CLI with npm

Argos is available as an npm package, [argos-cli](https://www.npmjs.com/package/argos-cli).

```sh
$ npm install --save argos-cli
```

### Configuring the CLI

The CLI needs the following environment variables to improve the experience:
- `ARGOS_COMMIT`: the commit the screenshots have been taken on
- `ARGOS_BRANCH`: the branch the screenshots have been taken on

He also needs a token to authorize push access to your repository.
```sh
$ export ARGOS_TOKEN=__ARGOS_TOKEN__
```


#### Example on Circle-CI

```sh
$ export ARGOS_TOKEN=__ARGOS_TOKEN__
$ ARGOS_COMMIT=$CIRCLE_SHA1 ARGOS_BRANCH=$CIRCLE_BRANCH \
  argos upload tmp/output/chrome --ignore **/*.diff.png --token $ARGOS_TOKEN || true
```

#### Example on Travis

```sh
$ export ARGOS_TOKEN=__ARGOS_TOKEN__
$ ARGOS_COMMIT=$TRAVIS_COMMIT ARGOS_BRANCH=$TRAVIS_BRANCH \
  argos upload sandbox/argos-bootstrap/screenshots --token $ARGOS_TOKEN || true
```
