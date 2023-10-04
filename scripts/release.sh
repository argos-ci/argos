#!/bin/bash

set -e

# Run migrations
npm run -w @argos-ci/backend db:migrate:latest

if [ "$SENTRY_RELEASE_DISABLED" != "true" ]; then
  # Setup releases on Sentry
  VERSION=$HEROKU_SLUG_COMMIT
  export SENTRY_ORG=argos

  # Create a release
  npx @sentry/cli releases new -p argos-browser -p argos-server $VERSION

  # Associate commits with the release
  npx @sentry/cli releases set-commits $VERSION --commit "argos-ci/argos@$VERSION"

  # Finalize the version
  npx @sentry/cli releases finalize $VERSION

  # Mark the deploy
  npx @sentry/cli releases deploys $VERSION new -e production
fi