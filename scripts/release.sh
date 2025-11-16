#!/bin/bash

# Release script for WayFinder Expedition Log
# Builds Windows installer and creates GitHub release

set -e

VERSION=$(node -p "require('./package.json').version")
REPO="ghostweasellabs/wayfinder-overload-app"

echo "Building version $VERSION..."

# Build the application
echo "Building application..."
yarn build

# Build Windows installer
echo "Building Windows installer..."
yarn electron:build:win

# Find the installer file
INSTALLER=$(find release -name "*.exe" -type f | head -1)

if [ -z "$INSTALLER" ]; then
  echo "Error: Installer not found in release directory"
  exit 1
fi

echo "Installer created: $INSTALLER"

# Check if gh CLI is available
if ! command -v gh &> /dev/null; then
  echo "Warning: GitHub CLI (gh) not found. Skipping release creation."
  echo "To create a release manually:"
  echo "  gh release create v$VERSION $INSTALLER --title \"v$VERSION\" --notes \"Release v$VERSION\""
  exit 0
fi

# Create GitHub release
echo "Creating GitHub release v$VERSION..."
gh release create "v$VERSION" \
  "$INSTALLER" \
  --repo "$REPO" \
  --title "v$VERSION" \
  --notes "Release v$VERSION

## Installation

Download the Windows installer and run it to install the application.

## Changes

See the [changelog](https://github.com/$REPO/blob/main/CHANGELOG.md) for details."

echo "Release created successfully!"
echo "View at: https://github.com/$REPO/releases/tag/v$VERSION"

