# Run migrations
yarn api:db:migrate

# Setup releases on Sentry
export SENTRY_ORG=argos
VERSION=$HEROKU_SLUG_COMMIT	

# Create a release
yarn sentry-cli releases new -p argos-browser -p argos-server $VERSION

# Associate commits with the release
yarn sentry-cli releases set-commits --commit "argos-ci/argos@$VERSION" $VERSION

# Mark the deploy
sentry-cli releases deploys $VERSION new -e production