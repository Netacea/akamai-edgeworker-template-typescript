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

if [ -f ".env" ]; then
    IFS=$'\n'
    export $(grep -v '^#' .env | xargs -0)
    IFS=
else 
    echo ".env does not exist!"
    exit 1
fi

if [[ "$AKAMAI_WORKER_ID" == "" ]]; then
    echo "AKAMAI_WORKER_ID is not defined in .env file"
    exit 1
fi

if [[ "$AKAMAI_PROPERTY_NAME" == "" ]]; then
    echo "AKAMAI_PROPERTY_NAME is not defined in .env file"
    exit 1
fi

export AKAMAI_WORKER_BUNDLE='worker.tar.gz'

cd $SCRIPTS_DIR
