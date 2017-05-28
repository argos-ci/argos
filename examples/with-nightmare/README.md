# Nightmare example

## How to use

Download the example [or clone the repo](https://github.com/argos-ci/argos):

```bash
curl https://codeload.github.com/argos-ci/argos/tar.gz/master | tar -xz --strip=2 argos-master/examples/with-nightmare
cd with-nightmare
```

Install it and run:

```bash
npm install
npm run test
npm run argos
```

## The idea behind the example

This example features how to use [nightmare](https://github.com/segmentio/nightmare) with Argos CI.
Nightmare uses Electron under the hood unlick most of the alternatives that use Selenium.
