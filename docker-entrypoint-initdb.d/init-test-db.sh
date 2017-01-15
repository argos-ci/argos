#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
  CREATE USER test;
  CREATE DATABASE test;
  GRANT ALL PRIVILEGES ON DATABASE test TO test;
EOSQL
