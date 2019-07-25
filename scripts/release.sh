# Run migrations
yarn db:migrate

# Install sentry-cli
curl -sL https://sentry.io/get-cli/ | bash

# Setup releases on Sentry
export SENTRY_AUTH_TOKEN=d2d0dd2bec244b7793310abc8101bf95d5f7c3f6b55f4ef18be3a4eeec01a3a4
export SENTRY_ORG=argos
VERSION=$(sentry-cli releases propose-version)

# Create a release
sentry-cli releases new -p argos-browser -p argos-server $VERSION

# Associate commits with the release
sentry-cli releases set-commits --commit "argos-ci/argos" $VERSION