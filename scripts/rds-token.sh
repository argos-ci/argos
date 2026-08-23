#!/bin/bash
#
# Mint a short-lived RDS IAM authentication token for the production database.
#
# The production Postgres roles authenticate with IAM only - no role has a
# password, so there is nothing to store in a password manager and nothing to
# leak. A token stands in for the password and is valid for 15 minutes.
#
#   scripts/rds-token.sh              # read-only role, token to the clipboard
#   scripts/rds-token.sh --psql       # open psql directly
#   scripts/rds-token.sh --user argos # another role (needs its own IAM policy)
#   scripts/rds-token.sh --raw        # just the token, for another program
#
# With --psql, anything this script does not recognise is handed to psql, so
#   scripts/rds-token.sh --psql -c 'select 1'
# works. Use -- to force what follows to psql (`-- --help`).
#
# TablePlus: set the password field's dropdown to "Command Line" and give it
# this script with the role you want, e.g.
#   /path/to/scripts/rds-token.sh --user argos_dev_ro
# TablePlus then fetches a fresh token on every connection, so nothing expires
# under you. The User field must name the SAME role as --user: the token is
# signed for one role and RDS rejects it for any other. SSL mode must be
# REQUIRED, because RDS refuses IAM tokens on plaintext connections.
#
# When stdout is not a terminal the script prints only the raw token, which is
# what makes the above work. Run it by hand and it copies to the clipboard
# instead.
#
# Everything this script prints is ASCII on purpose. A multibyte character
# touching a variable - an ellipsis right after "$DB_USER" - leaves bash unable
# to see where the name ends, so it reads the first byte of that character as
# part of it. That fails only in some locales, which means it survives testing
# and breaks on a colleague's machine. Braces around every expansion are the
# other half of the same guard.

set -euo pipefail

# TablePlus runs this from a GUI process, which inherits none of a login
# shell's PATH - Homebrew included, so `aws` would simply not be found.
PATH="/opt/homebrew/bin:/usr/local/bin:${PATH}"

HOST="${RDS_HOST:-argos-postgres.c1o45zoep0du.us-east-1.rds.amazonaws.com}"
PORT="${RDS_PORT:-5432}"
REGION="${RDS_REGION:-us-east-1}"
DATABASE="${RDS_DATABASE:-argos}"
# Not USER: that is the shell's own variable, and clobbering it makes for
# confusing failures in anything this script goes on to exec.
DB_USER="${RDS_USER:-argos_dev_ro}"
SSLMODE="${PGSSLMODE:-require}"
RUN_PSQL=false
RAW_OUTPUT=false
PSQL_ARGS=()

while [ $# -gt 0 ]; do
  case "$1" in
    --user) DB_USER="$2"; shift 2 ;;
    --host) HOST="$2"; shift 2 ;;
    --database) DATABASE="$2"; shift 2 ;;
    --psql) RUN_PSQL=true; shift ;;
    --raw) RAW_OUTPUT=true; shift ;;
    -h | --help)
      awk 'NR>1 && /^#/ { sub(/^# ?/, ""); print; next } NR>1 { exit }' "$0"
      exit 0
      ;;
    --) shift; PSQL_ARGS+=("$@"); break ;;
    *) PSQL_ARGS+=("$1"); shift ;;
  esac
done

if [ ${#PSQL_ARGS[@]} -gt 0 ] && [ "${RUN_PSQL}" = false ]; then
  echo "unknown argument: ${PSQL_ARGS[0]}" >&2
  echo "(arguments are forwarded to psql, which only happens with --psql)" >&2
  exit 1
fi

if ! command -v aws >/dev/null 2>&1; then
  echo "aws CLI not found - install it with \`brew install awscli\`." >&2
  exit 1
fi

# Fail here with a clear message rather than minting a token signed by nothing
# and letting Postgres report it as a password failure.
if ! aws sts get-caller-identity >/dev/null 2>&1; then
  echo "No usable AWS credentials. Sign in first (\`aws sso login\`), then retry." >&2
  exit 1
fi

TOKEN=$(aws rds generate-db-auth-token \
  --hostname "${HOST}" \
  --port "${PORT}" \
  --region "${REGION}" \
  --username "${DB_USER}")

if [ "${RUN_PSQL}" = true ]; then
  echo "Connecting to ${DATABASE} as ${DB_USER}..." >&2
  PGPASSWORD="${TOKEN}" PGSSLMODE="${SSLMODE}" exec psql \
    --host "${HOST}" --port "${PORT}" \
    --username "${DB_USER}" --dbname "${DATABASE}" \
    ${PSQL_ARGS[@]+"${PSQL_ARGS[@]}"}
fi

# Not a terminal means something is reading the token rather than someone -
# TablePlus's "Command Line" password mode, a pipe, a redirect. Print the bare
# token and nothing else, with no trailing newline, since a consumer that does
# not trim would otherwise send it as part of the password.
if [ ! -t 1 ] || [ "${RAW_OUTPUT}" = true ]; then
  printf '%s' "${TOKEN}"
  exit 0
fi

if command -v pbcopy >/dev/null 2>&1; then
  printf '%s' "${TOKEN}" | pbcopy
  echo "Token for \"${DB_USER}\" copied to the clipboard - valid 15 minutes."
  echo "Paste it as the password in TablePlus (host ${HOST}, SSL mode: require),"
  echo "or set the password field to \"Command Line\" and never paste again:"
  echo "  $(cd "$(dirname "$0")" && pwd)/$(basename "$0") --user ${DB_USER}"
else
  printf '%s\n' "${TOKEN}"
fi
