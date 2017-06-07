# Capybara example

## How to use

Download the example [or clone the repo](https://github.com/argos-ci/argos):

```bash
curl https://codeload.github.com/argos-ci/argos/tar.gz/master | tar -xz --strip=2 argos-master/examples/with-capybara
cd with-capybara
```

Install it and run:

```bash
docker-compose -f ../docker-compose.yml up
bundle install
bin/rails test:system
npm install
npm run argos
```

## The idea behind the example

This example features how to use [capybara](https://github.com/teamcapybara/capybara) with Argos CI.
