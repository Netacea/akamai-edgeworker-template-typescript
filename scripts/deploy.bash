#!/bin/bash
SCRIPTS_DIR=$(dirname $(realpath "$0"))
. $SCRIPTS_DIR/init.bash

cd $SCRIPTS_DIR
. bump_bundle_version.bash 

export NODE_ENV=$DEPLOY_MODE

echo "Bundling resources as $AKAMAI_WORKER_BUNDLE"
. bundle.bash

cd $SCRIPTS_DIR/..

# echo "Uploading bundle as ver$BUNDLE_VERSION" && \
# akamai edgeworkers upload $AKAMAI_WORKER_ID --bundle $AKAMAI_WORKER_BUNDLE && \
# echo "Activating ver$BUNDLE_VERSION" && \
# akamai edgeworkers activate $AKAMAI_WORKER_ID ${DEPLOY_MODE^^} $BUNDLE_VERSION
