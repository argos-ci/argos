# Rails example

## How to use

Download the example [or clone the repo](https://github.com/argos-ci/argos):

```bash
curl https://codeload.github.com/argos-ci/argos/tar.gz/master | tar -xz --strip=2 argos-master/examples/with-rails
cd with-rails
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

This example features how to use [rails](https://github.com/rails/rails) with Argos CI.
It's using [Capybara](https://github.com/teamcapybara/capybara) under the hood.
