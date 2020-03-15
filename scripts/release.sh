#!/bin/bash

set -e

# Run migrations
yarn workspace @argos-ci/database db:migrate:latest

if [ "$SENTRY_RELEASE_DISABLED" != "true" ]; then
  # Setup releases on Sentry
  VERSION=$HEROKU_SLUG_COMMIT
  export SENTRY_ORG=argos

  # Create a release
  yarn sentry-cli releases new -p argos-browser -p argos-server $VERSION	

  # Associate commits with the release
  yarn sentry-cli releases set-commits $VERSION --commit "argos-ci/argos@$VERSION" 

  # Finalize the version
  yarn sentry-cli releases finalize $VERSION

  # Mark the deploy
  yarn sentry-cli releases deploys $VERSION new -e production
fi