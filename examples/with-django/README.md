# Django example

## How to use

Download the example [or clone the repo](https://github.com/argos-ci/argos):

```bash
curl https://codeload.github.com/argos-ci/argos/tar.gz/master | tar -xz --strip=2 argos-master/examples/with-django
cd with-django
```

Install it and run:

```bash
docker-compose -f ../docker-compose.yml up
pip install -r requirements.txt
python manage.py test screenshot
npm install
npm run argos
```

## The idea behind the example

This example features how to use [Django](https://github.com/django/django) with Argos CI.
This is also demonstrating how to use [unittest](https://docs.python.org/3.6/library/unittest.html) as the test framework used by Django under the hood.
