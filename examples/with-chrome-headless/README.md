# Chrome headless example

## How to use

Download the example [or clone the repo](https://github.com/argos-ci/argos):

```bash
curl https://codeload.github.com/argos-ci/argos/tar.gz/master | tar -xz --strip=2 argos-master/examples/with-chrome-headless
cd with-chrome-headless
```

Install it and run:

```bash
docker-compose up
npm install
npm run test
npm run argos
```

## The idea behind the example

This example features how to use [chrome-headless](https://developers.google.com/web/updates/2017/04/headless-chrome) with Argos CI.
