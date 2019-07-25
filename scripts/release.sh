# Run migrations
yarn api:db:migrate

# Install sentry-cli
yarn add @sentry/cli --dev

# Setup releases on Sentry
export SENTRY_AUTH_TOKEN=c1ca8a7da65a4482a8d7ea10c9e10dea9a5aff40d0a044cb8ae2d020f7291b8a
export SENTRY_ORG=argos
VERSION=$(sentry-cli releases propose-version)

# Create a release
yarn sentry-cli releases new -p argos-browser -p argos-server $VERSION

# Associate commits with the release
yarn sentry-cli releases set-commits --commit "argos-ci/argos" $VERSION