#!/bin/bash
set -ev

export NODE_ENV=test

yarn lint

yarn db:load
yarn test:unit

# Database commands
yarn db:reset
yarn db:seed
yarn db:truncate

yarn argos
