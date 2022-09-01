#!/bin/bash
SCRIPTS_DIR=$(dirname $(realpath "$0"))
. $SCRIPTS_DIR/init.bash

cd $SCRIPTS_DIR
. bump_bundle_version.bash 

export NODE_ENV=$DEPLOY_MODE

echo "Bundling resources as $AKAMAI_WORKER_BUNDLE"
. bundle.bash

cd $SCRIPTS_DIR/..
