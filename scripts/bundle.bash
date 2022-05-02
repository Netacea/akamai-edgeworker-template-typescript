#!/bin/bash

if [[ $SCRIPTS_DIR == "" ]]; then
    # Invoked as standalone script
    SCRIPTS_DIR=$(dirname $(realpath "$0"))
    . $SCRIPTS_DIR/init.bash
fi

cd $SCRIPTS_DIR/..

npx rollup src/index.ts -c ./rollup.config.js && \
tar -cvzf $AKAMAI_WORKER_BUNDLE main.js bundle.json || exit 1

cd $SCRIPTS_DIR
