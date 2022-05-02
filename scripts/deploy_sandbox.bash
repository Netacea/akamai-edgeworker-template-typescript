#!/bin/bash
SCRIPTS_DIR=$(dirname $(realpath "$0"))
. $SCRIPTS_DIR/init.bash

export NODE_ENV=local
echo "Bundling source code"
. $SCRIPTS_DIR/bundle.bash

cd $SCRIPTS_DIR/..
echo "Uploading bundle to Akamai sandbox"
akamai sandbox update-edgeworker $AKAMAI_WORKER_ID $AKAMAI_WORKER_BUNDLE

echo "Launching sandbox"
npm run start
