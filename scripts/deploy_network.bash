#!/bin/bash
SCRIPTS_DIR=$(dirname $(realpath "$0"))
. $SCRIPTS_DIR/init.bash

USER_DEFINED_VER=""
while getopts "v:m:" o; do
    case "${o}" in
        m) DEPLOY_MODE=${OPTARG,,};;
        v) USER_DEFINED_VER=$OPTARG;;
    esac
done

if [[ $DEPLOY_MODE == "" ]]; then
    echo "Deploy mode (-m) is not provided!"
    exit 1
elif [[ $DEPLOY_MODE != "staging" && $DEPLOY_MODE != "production" ]]; then
    echo "Deploy mode '$DEPLOY_MODE' is illegal! It must be 'staging' or 'production'"
    exit 1
fi

cd $SCRIPTS_DIR
. bump_bundle_version.bash 

export NODE_ENV=$DEPLOY_MODE

echo "Bundling resources as $AKAMAI_WORKER_BUNDLE"
. bundle.bash

cd $SCRIPTS_DIR/..

echo "Uploading bundle as ver$BUNDLE_VERSION" && \
akamai edgeworkers upload $AKAMAI_WORKER_ID --bundle $AKAMAI_WORKER_BUNDLE && \
echo "Activating ver$BUNDLE_VERSION" && \
akamai edgeworkers activate $AKAMAI_WORKER_ID ${DEPLOY_MODE^^} $BUNDLE_VERSION
