# Happo example

## How to use

Download the example [or clone the repo](https://github.com/argos-ci/argos):

```bash
curl https://codeload.github.com/argos-ci/argos/tar.gz/master | tar -xz --strip=2 argos-master/examples/with-happo
cd with-happo
```

Install it and run:

```bash
npm install
npm run test
npm run argos
```

## The idea behind the example

This example features how to use [happo](https://github.com/Galooshi/happo) with Argos CI.
This is a test runner that allow to take screenshots of components in isolation.
What do we mean by **component**?
It's a piece of interface usable in different contexts.
We are demonstrating components in the world of React.
