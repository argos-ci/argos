# Argos

> Automate visual regression testing.

Note: this is a fork of https://github.com/argos-ci/argos.

[![Build Status](https://travis-ci.org/doctolib/argos.svg?branch=master)](https://travis-ci.org/doctolib/argos)

At Doctolib, it is run on [Heroku](https://dashboard.heroku.com/apps/doctolib-argos) through the `Procfile` file, which launches three jobs.

# Install

```sh
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.2/install.sh | bash

# MacOS
brew install imagemagick@6 graphicsmagick autoenv watchman
# Linux
sudo apt-get install graphicsmagick imagemagick

nvm install
nvm alias default "$(cat .nvmrc)"
npm install -g yarn
yarn
```

# Local development

Download [Docker](https://docs.docker.com/compose/install/#install-compose) and run the following command:

```sh
docker-compose up
```

Setup your `.env` file:

```
AWS_ACCESS_KEY_ID=AKIAI53TPOJJ4ER6W4ZQ
AWS_SECRET_ACCESS_KEY=X7xKJCMa/2DaII/X40JazrW+kNHOn7c5sy692Pd9
AWS_SCREENSHOTS_BUCKET=project-argos-dev
GITHUB_CLIENT_SECRET=1781c9a3e1d57fdcfdf9c29c02abf7d37e1c0427
```

Edit your hosts:

```
# Argos
127.0.0.1 www.dev.argos-ci.com
127.0.0.1 api.dev.argos-ci.com
```

Set up the database:

```sh
yarn api:db:reset
yarn db:truncate && yarn db:seed # OPTIONAL: fill with some development data
```

Finally, start the servers:

```sh
yarn web:dev # run server and workers
yarn review:dev # run client assets
```

Visit: [http://www.dev.argos-ci.com:4002/](http://www.dev.argos-ci.com:4002/).

## S3 bucket

**It is recommended that you either use the S3 bucket for production or the one dedicated to development**: ask Bertrand Paquet for the credentials.

However, if you want to create a new one and use it, here's how to:

1. Install the AWS CLI (`pip3 install awscli`) and run `aws configure`.

2. Create a new user and an access key:

   ```bash
   aws iam create-user --user-name argos
   aws iam create-access-key --user-name argos
   ```

   Update your `.env` file with the user's access and secret access keys.

3. Retrieve your account ID:

   ```bash
   account_id=$(aws sts get-caller-identity --output text --query 'Account')
   ```

4. Create buckets:

   ```bash
   for bucket in argos-screenshots{,dev,test}; do
     aws s3api create-bucket --bucket $bucket
     aws s3api put-bucket-policy --bucket $bucket --policy '{
       "Version": "2012-10-17",
       "Statement": [
         {
           "Effect": "Allow",
           "Principal": {
             "AWS": "*"
           },
           "Action": "s3:GetObject",
           "Resource": "arn:aws:s3:::'$bucket'/*"
         },
         {
           "Effect": "Allow",
           "Principal": {
             "AWS": "arn:aws:iam::'$account_id':argos"
           },
           "Action": "s3:PutObject",
           "Resource": "arn:aws:s3:::'$bucket'/*"
         }
       ]
     }'
   done
   ```

## Jobs

### Recover pending or error jobs

1. Run console on heroku: `heroku run yarn run console`
2. Get all concerned objects (ex: `const builds = Build.query().whereNot({ jobStatus: 'complete' })`)
3. Add a job for these objects (ex: `builds.then(builds => builds.forEach(build => buildJob.push(build.id)))`)
4. Verify that jobs are correctly processed: `Build.query().whereNot({ jobStatus: 'complete' })`

## Database

### Structure

- _builds_ = a run on a single commit pushed to Github
- _baseScreenshotBucket_ = buckets of screenshots from merge-base master commit
- _screenshot_batches_ = batches uploaded by single nodes from our Doctolib CI
- _1 build_ = 2 buckets
- _1 bucket_ = 15 batches (16-1 on Heroku CI)
- _screenshot_diffs_ = link to red and white images (diff images), column `s3Id`

### Reuse the production one for development purposes

Not ideal since it contains Github tokens. https://devcenter.heroku.com/articles/heroku-postgres-import-export#restore-to-local-database

### Create a migration

```sh
./node_modules/.bin/knex migrate:make my_migration
```

### Dump database

```sh
yarn db:dump
```

### Execute the latest migration

```sh
yarn db:migrate:latest
```

## Tests

```sh
yarn test:unit
```

## Upload screenshots from local Doctolib repo to local Argos

Set the env variable [ARGOS_API_ENDPOINT](https://github.com/argos-ci/argos-cli/blob/dcfdc9db21d2e8b2434bd0c95519dbae2a879558/src/config.js#L9) and then upload the screenshots with `argos-cli`.

Add `ARGOS_BRANCH=master` to upload reference screenshots.

# Deploy

Just push on the master branch.

# Roadmap (Doctolib-specific)

https://docs.google.com/document/d/1WnpKXa1eRMYHWhAk-C0GWAhBaysaiqxeP0P9nb3Tj7w/edit#heading=h.bro5nr627ikl

# Troubleshooting

Make sure it hasn't already been [reported or fixed](https://github.com/argos-ci/argos/issues?utf8=%E2%9C%93&q=is%3Aopen+is%3Aclosed).

## Known problems at Doctolib

First, always check [https://sentry.io/doctolib/argos/](https://sentry.io/doctolib/argos/) for signs of problems.
Helpful commands:

```sh
heroku git:remote -a doctolib-argos # name can be found at: https://dashboard.heroku.com/apps/doctolib-argos/deploy/heroku-git)
heroku config
heroku config --shell # Get production credentials
```

To restart all dynas, at https://dashboard.heroku.com/apps/doctolib-argos/resources use the top-right corner button "_More_" then "_Restart all dynos_", **or** set 0 dynos for each job, and then set them back the way they were before.

### 1. The job `buildAndSynchronize` crashes silently and does not restart by itself

If it happened recently enough, you might be able to see the crash logs by running `heroku logs --tail --app doctolib-argos | grep buildAndSynchronize`

How to fix:

1. Go to https://dashboard.heroku.com/apps/doctolib-argos/resources
1. Click on [CloudAMQP](https://addons-sso.heroku.com/apps/6a65d6ef-042b-4dd7-a0de-ea98e2ca7411/addons/c8426a12-05f0-447c-85d4-d32bf11d3684)
1. Click on the green button "_RabbitMQ Manager_"
1. In the "_Queues_" tab, select the queue "_build_"
1. Below "_Get messages_", do: _Requeue_: no, and get 1 message.
1. Back to https://dashboard.heroku.com/apps/doctolib-argos/resources, restart all dynos through the "_More_" button in the top-right corner

probleme de crash, dequeue un seul de queue 'build' (https://impala.rmq.cloudamqp.com/#/queues/rfjlrqhu/build) puis relancer tous les dynos

#### 2. Github Token is expired

Argos uses [Cyril Champier's Github token](https://github.com/doctolib/argos/commit/7722b4598bd74746c24420483c7f7b346dc10ae2) to communicate with Github. Every once in a while, it expires.

How to fix:

- Ask Cyril to re-login into Argos

OR

- Manually update Cyril's token with someone's else token, through Adminium:
  - At https://dashboard.heroku.com/apps/doctolib-argos/resources, click on [Adminium](https://addons-sso.heroku.com/apps/6a65d6ef-042b-4dd7-a0de-ea98e2ca7411/addons/3bbf4f69-7ddd-40d0-bea3-1e4cd01ce832)
  - Update the token in the [users table](https://www.adminium.io/resources/users)

#### 3. Database is full

Our current plan does not offer unlimited database plan.

How to fix: empty some tables/delete some rows wherever you like.
