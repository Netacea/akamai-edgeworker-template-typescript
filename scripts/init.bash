#!/bin/bash

if [[ $SCRIPTS_DIR == "" ]]; then
    # Invoked as standalone script rather than sourced
    SCRIPTS_DIR=$(dirname $(realpath "$0"))
fi

cd $SCRIPTS_DIR/..

if [[ "$(akamai --version)" != "akamai "* ]]; then
    echo "Akamai CLI is not installed! Please follow README to set it up."
    exit 1
fi

export AKAMAI_WORKER_BUNDLE='worker.tar.gz'

cd $SCRIPTS_DIR
