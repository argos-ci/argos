#!/bin/bash
set -ev

export NODE_ENV=test

yarn lint

yarn db:load
yarn test:unit

yarn db:seed
yarn db:truncate

yarn argos
