#!/bin/bash

if [[ $SCRIPTS_DIR == "" ]]; then
    # Invoked as standalone script rather than sourced
    SCRIPTS_DIR=$(dirname $(realpath "$0"))
fi

cd $SCRIPTS_DIR/..

export AKAMAI_WORKER_BUNDLE='worker.tar.gz'

cd $SCRIPTS_DIR
