#!/bin/bash
#
# Fail with an actionable message when there is no usable AWS session.
#
# Production Postgres accepts no passwords: every connection is opened with an
# RDS IAM token signed from your AWS credentials. Without them the caller only
# finds out at connection time, as a password failure that names nothing.

set -euo pipefail

# Callers may run from a GUI process, which inherits none of a login shell's
# PATH - Homebrew included, so `aws` would simply not be found.
PATH="/opt/homebrew/bin:/usr/local/bin:${PATH}"

if ! command -v aws >/dev/null 2>&1; then
  echo "aws CLI not found - install it with \`brew install awscli\`." >&2
  exit 1
fi

if ! aws sts get-caller-identity >/dev/null 2>&1; then
  echo "No AWS session - the production database needs one. Run \`aws login\`, then retry." >&2
  exit 1
fi
