#!/bin/bash

if [[ $SCRIPTS_DIR == "" ]]; then
    # Invoked as standalone script
    SCRIPTS_DIR=$(dirname $(realpath "$0"))
    . $SCRIPTS_DIR/init.bash
fi

cd $SCRIPTS_DIR/..

if [[ $USER_DEFINED_VER == "" ]]; then
    export BUNDLE_VERSION=$(akamai edgeworkers list-versions $AKAMAI_WORKER_ID | node utils/bumpBundleVersion2.js)

elif [[ $USER_DEFINED_VER =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    export BUNDLE_VERSION=$USER_DEFINED_VER

else 
    echo "Version provided in illegal format! Bundle version should follow \"{int}.{int}.{int}\""
    exit 1
fi

REGEX='s/\("edgeworker-version":\).*/\1'
REGEX+=" \"$BUNDLE_VERSION\",/g"
sed -i "$REGEX" bundle.json

cd $SCRIPTS_DIR
