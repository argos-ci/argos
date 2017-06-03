# Pytest example

## How to use

Download the example [or clone the repo](https://github.com/argos-ci/argos):

```bash
curl https://codeload.github.com/argos-ci/argos/tar.gz/master | tar -xz --strip=2 argos-master/examples/with-pytest
cd with-pytest
```

Install it and run:

```bash
docker-compose -f ../docker-compose.yml up
pip install -r requirements.txt
pytest --driver Remote --variables capabilities.json
npm install
npm run argos
```

## The idea behind the example

This example features how to use [Pytest](https://github.com/pytest-dev/pytest) with Argos CI.
