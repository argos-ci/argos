set -e

# Run migrations
yarn api:db:migrate

if [ "$SENTRY_RELEASE_DISABLED" != "true" ]; then
  # Setup releases on Sentry
  export SENTRY_ORG=argos
  VERSION=$HEROKU_RELEASE_VERSION	

  # Create a release
  yarn sentry-cli releases new -p argos-browser -p argos-server $VERSION

  # Associate commits with the release
  yarn sentry-cli releases set-commits --commit "argos-ci/argos@$VERSION" $VERSION

  # Mark the deploy
  sentry-cli releases deploys $VERSION new -e production

fi