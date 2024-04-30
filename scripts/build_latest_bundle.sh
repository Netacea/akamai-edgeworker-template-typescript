#!/bin/bash
# Exit on error
set -euo pipefail

# Update @netacea/akamai package to latest version
npm i --save @netacea/akamai@latest

# Get the version of @netacea/akamai now installed and derive the bundle name
version=$(npm list --json | jq -r '.dependencies["@netacea/akamai"].version')
bundle_name="netacea-worker-$version.tar.gz"
echo -e "\nCreating release assets for @netacea/akamai@$version with name $bundle_name"

# Update the bundle.json file to use the latest version number
updated_bundle=$(jq --arg ver "$version" '.["edgeworker-version"] = $ver' bundle.json)
echo -n "$updated_bundle" > bundle.json

# Build main.js
npm run build
npm run rollup

# Create the release tar file
tar -cvzf $bundle_name main.js bundle.json || exit 1
