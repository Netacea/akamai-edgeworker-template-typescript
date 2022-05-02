#!/bin/bash
SCRIPTS_DIR=$(dirname $(realpath "$0"))
. $SCRIPTS_DIR/init.bash
. $SCRIPTS_DIR/curl_common.bash

echo "${MYCOMMAND[@]}"
${MYCOMMAND[@]}
