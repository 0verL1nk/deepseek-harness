#!/usr/bin/env bash
# Publish the merged desktop artifacts to the tag's GitHub Release. The
# Desktop workflow's release job invokes this with GH_TOKEN, TAG, and REPO
# in the environment; it passes no command-line arguments.
set -euo pipefail

# Every v* tag publishes as a regular release on the stable channel:
# this distribution has a single channel, so prerelease gating would only
# hide releases from clients.

# The release job otherwise resolves the repository from the artifact-free
# workspace only; name it explicitly.
gh release view "$TAG" --repo "$REPO" >/dev/null 2>&1 || gh release create "$TAG" --generate-notes --title "$TAG" --repo "$REPO"

# Upload the distributables one level under the merged artifacts; the -f test
# keeps directories out even if an artifact regains scaffolding, and a zero
# file count fails loud instead of publishing an empty release.
count=0
for f in dist/desktop/*; do
  [ -f "$f" ] || continue
  gh release upload "$TAG" "$f" --clobber --repo "$REPO"
  count=$((count + 1))
done
if [ "$count" -eq 0 ]; then
  echo "::error::no release files found under dist/desktop" >&2
  exit 1
fi
