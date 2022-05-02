const readline = require('readline')
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

const versions = []

rl.on('line', function(line){
    /**
    --- The following EdgeWorker Versions are currently registered for account: F-AC-2651502, ewId: 44532, version: any ---
-----------------------------------------------------------------------------------------------------------------------
┌─────────┬──────────────┬─────────┬────────────────────────────────────────────────────────────────────┬───────────────────────────────┬────────────────────────┐
│ (index) │ edgeWorkerId │ version │                              checksum                              │           createdBy           │      createdTime       │
├─────────┼──────────────┼─────────┼────────────────────────────────────────────────────────────────────┼───────────────────────────────┼────────────────────────┤
│    0    │    44532     │ '0.0.1' │ '6d6b4601f2cd0cd180187fd88e6738eafd3f5800996236294599fd476266f4a2' │ 'richard.walkden@netacea.com' │ '2022-04-14T13:40:11Z' │
│    1    │    44532     │ '0.0.2' │ 'aeb580579065768478cc867cf54358f7265822c32339e2221b1badb517313bd7' │ 'richard.walkden@netacea.com' │ '2022-04-14T16:15:18Z' │
└─────────┴──────────────┴─────────┴────────────────────────────────────────────────────────────────────┴───────────────────────────────┴────────────────────────┘
     * The regex below extracts the versions from the stream
     */
    let match = line.match(/(.|\n)*'(\d+).(\d+).(\d+)'/)

    if(match) {
        versions.push(match.slice(2, 5).map(str => Number(str)));
    }
})

rl.on('close', function() {
    let current = [0, 0, 0]
    if (versions.length > 0) {
        versions.sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]) || (a[2] - b[2]))
        current = versions.pop()
    }
    current[2] += 1
    process.stdout.write(current.join('.'))
})
