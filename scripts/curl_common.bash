#!/bin/bash

if [[ $AKAMAI_STAGING_IP == "" ]]; then
    echo "The IP address of staging host is not logged in your .env file"
    echo "Please run 'npm run log_staging_ip' to update it before retrying."
    exit 1
fi

MYCOMMAND=(curl "$@")

# Debug enabling header
MYCOMMAND+=(-H 'Pragma: akamai-x-ew-debug, akamai-x-ew-debug-subs, akamai-x-ew-debug-rp')

if [[ $AKAMAI_DEBUG_HEADER != "" ]]; then
    # Use bash ./scripts/log_token.bash to get/refresh debug token header
    MYCOMMAND+=(-H $AKAMAI_DEBUG_HEADER)
fi
