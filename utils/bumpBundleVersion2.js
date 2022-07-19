const readline = require('readline')
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

const versions = []

rl.on('line', function(line){
    /**
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
