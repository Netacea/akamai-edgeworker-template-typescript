#!/bin/bash
SCRIPTS_DIR=$(dirname $(realpath "$0"))
. $SCRIPTS_DIR/init.bash
. $SCRIPTS_DIR/curl_common.bash

# Reroute your hostname to staging network
# You shouldn't need to modify /etc/hosts to access staging
MYCOMMAND+=(--resolve $AKAMAI_PROPERTY_HOST:80:$AKAMAI_STAGING_IP)
MYCOMMAND+=(--resolve $AKAMAI_PROPERTY_HOST:443:$AKAMAI_STAGING_IP)
MYCOMMAND+=(--resolve $AKAMAI_PROPERTY_HOST:9550:$AKAMAI_STAGING_IP)

echo "${MYCOMMAND[@]}"
${MYCOMMAND[@]}
