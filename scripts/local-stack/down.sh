#!/usr/bin/env bash
# Removes the containers started by scripts/local-stack/up.sh.
docker rm -f rn-pg rn-gotrue rn-rest rn-storage rn-gateway >/dev/null 2>&1 || true
echo "Local stack removed."
