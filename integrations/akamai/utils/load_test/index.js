const autocannon = require("autocannon")
const ncrd = require('ncr-decode')

// const url = "http://backend-akamai.traffic-defender-uat.co.uk:9550"
const url = "https://gosato-akamai.traffic-defender-uat.co.uk"

// Get from output of npm run log_token in Akamai example directory
const log_token = "Akamai-EW-Trace: st=1642426427~exp=1642469627~acl=/*~hmac=1f8c97ba4e2e858e567ffcec3cb61b3f3b48a38d828fc6c6788d012aeb633592"

const FgYellow = "\x1b[33m"
const Reset = "\x1b[0m"
const FgRed = "\x1b[31m"
function onResponse(status, body, context, headers) {
  if (status === 500) {
    const bodyText = ncrd.decode(body)
    const refNum = bodyText.match(/#([0-9]|\.|[a-f])+/)[0].substr(1)
    console.log(`FAILURE. Ref: ${FgYellow}${refNum}${Reset} - ResponseProvider Info: ${FgRed}${headers["X-Akamai-EdgeWorker-ResponseProvider-Info"]}${Reset}`)
    if (refNum.startsWith("21")) console.log ("Likely a Resource Limit Error...")
    else if (refNum.startsWith("174")) console.log ("Metadata Apply Error...")
    else console.log ("Unknown Error Prefix")
  }
}


autocannon({
  url,
  connections: 50,
  overallRate: 200,
  requests: [
    { 
      headers: {
        "pragma": "akamai-x-ew-debug, akamai-x-ew-debug-subs",
        "Akamai-EW-Trace": log_token,
        "user-agent": "AUTOCANNON TESTING (FAST)"
      },
      onResponse
    },
  ],
  connectionRate: 10,
  amount: 50000,
  maxOverallRequests: 50000,
  duration: 600
}, 
(err, data) => {
  console.log("Status Codes:", data.statusCodeStats)
  console.log("Average latency:", data.latency.average)
})