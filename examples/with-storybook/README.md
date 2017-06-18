# Storybook example

## How to use

Download the example [or clone the repo](https://github.com/argos-ci/argos):

```bash
curl https://codeload.github.com/argos-ci/argos/tar.gz/master | tar -xz --strip=2 argos-master/examples/with-storybook
cd with-storybook
```

Install it and run:

```bash
npm install
npm run test
npm run argos
```

## The idea behind the example

This example features how to use [storybook](https://github.com/storybooks/storybook) with Argos CI.
We are also using [Happo](https://github.com/Galooshi/happo) as an intermediary tool to take the screenshots of the different stories.
