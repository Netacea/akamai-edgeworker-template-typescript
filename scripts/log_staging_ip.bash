#!/bin/bash
SCRIPTS_DIR=$(dirname $(realpath "$0"))
. $SCRIPTS_DIR/init.bash

EDGEKEY_HOST="$AKAMAI_PROPERTY_HOST.edgekey-staging.net"
RESOLVED_IP=$(getent ahosts $EDGEKEY_HOST | awk '{ print $1; exit }')

if [[ $RESOLVED_IP == "" ]]; then
    EDGESUITE_HOST="$AKAMAI_PROPERTY_HOST.edgesuite-staging.net"
    RESOLVED_IP=$(getent ahosts $EDGESUITE_HOST | awk '{ print $1; exit }')
fi 

if [[ $RESOLVED_IP == "" ]]; then
    echo "Host '$AKAMAI_PROPERTY_HOST' was not found on edgekey-staging.net nor edgekey-suite.net."
    echo "Please make sure the host is deployed on Akamai's staging network."
    exit 1
fi

cd $SCRIPTS_DIR/..

sed -i '/^AKAMAI_STAGING_IP=.*/d' .env
if ! [[ $(tail -c1 .env | wc -l) -gt 0 ]]; then
    # To make >> work properly, the target file must end with newline
    echo "" >> .env
fi

echo "AKAMAI_STAGING_IP=$RESOLVED_IP" >> .env
echo "AKAMAI_STAGING_IP is added to your .env file";
