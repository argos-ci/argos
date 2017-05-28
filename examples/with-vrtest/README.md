# vrtest example

## How to use

Download the example [or clone the repo](https://github.com/argos-ci/argos):

```bash
curl https://codeload.github.com/argos-ci/argos/tar.gz/master | tar -xz --strip=2 argos-master/examples/with-vrtest
cd with-vrtest
```

Install it and run:

```bash
docker-compose -f ../docker-compose.yml up
npm install
npm run test
npm run argos
```

### OS X

Due to issues with networking in OS X, getting the container to see the
test page may require additional configuration as the `docker0` interface
does not exist.

You can create an alias for the loopback interface using the instructions
provided at https://docs.docker.com/docker-for-mac/networking/#/there-is-no-docker0-bridge-on-macos

```
sudo ifconfig lo0 alias 10.200.10.1/24
```

## The idea behind the example

This example features how to use [vrtest](https://github.com/nathanmarks/vrtest) with Argos CI.
This is a test runner that allow to take screenshots of components in isolation.
What do we mean by **component**?
It's a piece of interface usable in different contexts.
We are demonstrating components in the world of React, Angular and Vue.
