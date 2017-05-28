# Nightwatch example

## How to use

Download the example [or clone the repo](https://github.com/argos-ci/argos):

```bash
curl https://codeload.github.com/argos-ci/argos/tar.gz/master | tar -xz --strip=2 argos-master/examples/with-nightwatch
cd with-nightwatch
```

Install it and run:

```bash
docker-compose -f ../docker-compose.yml up
npm install
npm run test
npm run argos
```

## The idea behind the example

This example features how to use [nightwatch](https://github.com/nightwatchjs/nightwatch) with Argos CI.
