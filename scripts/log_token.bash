#!/bin/bash
SCRIPTS_DIR=$(dirname $(realpath "$0"))
. $SCRIPTS_DIR/init.bash

AKAMAI_NETWORK='staging'
while getopts "m:" o; do
    case "${o}" in
        m) AKAMAI_NETWORK=${OPTARG,,};;
    esac
done

if [[ $AKAMAI_NETWORK != "staging" && $AKAMAI_NETWORK != "production" ]]; then
    echo "Invalid network '$AKAMAI_NETWORK' is provided! It must be 'staging' or 'production'"
    exit 1
fi

DEBUG_HEADER=$(akamai edgeworkers auth --expiry 720 $AKAMAI_PROPERTY_NAME --network $AKAMAI_NETWORK | grep "Akamai-EW-Trace:")

cd $SCRIPTS_DIR/..

sed -i '/^AKAMAI_DEBUG_HEADER=.*/d' .env
if ! [[ $(tail -c1 .env | wc -l) -gt 0 ]]; then
    # To make >> work properly, the target file must end with newline
    echo "" >> .env
fi

echo "AKAMAI_DEBUG_HEADER=$DEBUG_HEADER" >> .env
echo "AKAMAI_DEBUG_HEADER is added to your .env file";
