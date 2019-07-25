# Run migrations
yarn db:migrate

# Install sentry-cli
yarn add @sentry/cli --dev

# Setup releases on Sentry
export SENTRY_AUTH_TOKEN=d2d0dd2bec244b7793310abc8101bf95d5f7c3f6b55f4ef18be3a4eeec01a3a4
export SENTRY_ORG=argos
VERSION=$(sentry-cli releases propose-version)

# Create a release
yarn sentry-cli releases new -p argos-browser -p argos-server $VERSION

# Associate commits with the release
yarn sentry-cli releases set-commits --commit "argos-ci/argos" $VERSION