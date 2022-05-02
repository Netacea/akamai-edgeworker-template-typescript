#!/bin/bash
SCRIPTS_DIR=$(dirname $(realpath "$0"))
. $SCRIPTS_DIR/init.bash
. $SCRIPTS_DIR/curl_common.bash

# Reroute your hostname to sandbox (localhost)
# You shouldn't need to modify /etc/hosts to access sandbox
MYCOMMAND+=(--resolve $AKAMAI_PROPERTY_HOST:9550:127.0.0.1)

${MYCOMMAND[@]}
