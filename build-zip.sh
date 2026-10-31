#!/bin/sh
# Makes the zip file for the Chrome Web Store.
# It puts in only the files that the extension needs.

set -e

cd "$(dirname "$0")"

VERSION=$(grep '"version"' manifest.json | sed 's/.*"version": *"\([^"]*\)".*/\1/')
OUTPUT="dist/site-dark-mode-$VERSION.zip"

mkdir -p dist
rm -f "$OUTPUT"

zip -r "$OUTPUT" \
  manifest.json \
  background.js \
  content.js \
  page-world.js \
  rules.json \
  icons \
  -x "*.DS_Store"

echo "Done: $OUTPUT"
