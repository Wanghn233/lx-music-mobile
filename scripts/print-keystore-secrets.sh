#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KEYSTORE_PATH="${1:-$ROOT_DIR/android/app/luna-release.keystore}"
SECRETS_ENV_PATH="${2:-$ROOT_DIR/android/keystore-secrets.env}"

if [[ ! -f "$KEYSTORE_PATH" ]]; then
  echo "Keystore not found: $KEYSTORE_PATH" >&2
  exit 1
fi

if [[ ! -f "$SECRETS_ENV_PATH" ]]; then
  echo "Secrets env file not found: $SECRETS_ENV_PATH" >&2
  exit 1
fi

set -a
source "$SECRETS_ENV_PATH"
set +a

if [[ -z "${KEYSTORE_STORE_FILE:-}" || -z "${KEYSTORE_KEY_ALIAS:-}" || -z "${KEYSTORE_PASSWORD:-}" || -z "${KEYSTORE_KEY_PASSWORD:-}" ]]; then
  echo "Missing required variables in $SECRETS_ENV_PATH" >&2
  exit 1
fi

KEYSTORE_STORE_FILE_BASE64="$(base64 < "$KEYSTORE_PATH" | tr -d '\n')"

cat <<EOF
Add these values in GitHub:
Settings -> Secrets and variables -> Actions -> New repository secret

KEYSTORE_STORE_FILE=${KEYSTORE_STORE_FILE}
KEYSTORE_KEY_ALIAS=${KEYSTORE_KEY_ALIAS}
KEYSTORE_PASSWORD=${KEYSTORE_PASSWORD}
KEYSTORE_KEY_PASSWORD=${KEYSTORE_KEY_PASSWORD}
KEYSTORE_STORE_FILE_BASE64=${KEYSTORE_STORE_FILE_BASE64}
EOF
