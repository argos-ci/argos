# WebdriverIO example

## How to use

Download the example [or clone the repo](https://github.com/argos-ci/argos):

```bash
curl https://codeload.github.com/argos-ci/argos/tar.gz/master | tar -xz --strip=2 argos-master/examples/with-wdio
cd with-wdio
```

Install it and run:

Install [GraphicsMagick](https://github.com/zinserjan/wdio-screenshot#use-graphicsmagick)

```bash
docker-compose -f ../docker-compose.yml up
npm install
npm run test
npm run argos
```

## The idea behind the example

This example features how to use [webdriverio](https://github.com/webdriverio/webdriverio) with Argos CI.
It's using [wdio-screenshot](https://github.com/zinserjan/wdio-screenshot) and [wdio-visual-regression-service](https://github.com/zinserjan/wdio-visual-regression-service) to take the screenshots.
