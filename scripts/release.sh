#!/bin/bash

set -e

# Run migrations
npm run -w @argos/backend db:migrate:latest
