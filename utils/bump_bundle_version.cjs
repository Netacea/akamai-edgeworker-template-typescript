const path = require("path")

const BUNDLE_PATH = path.resolve(__dirname, "../bundle.json")

const bundle = require(BUNDLE_PATH)
const fs = require("fs")

const versionArr = bundle["edgeworker-version"].split(".")
const patch = parseInt(versionArr[versionArr.length - 1])
versionArr[versionArr.length - 1] = String(patch + 1)
bundle["edgeworker-version"] = versionArr.join(".")

console.log(bundle["edgeworker-version"])

fs.writeFileSync(BUNDLE_PATH, JSON.stringify(bundle, null, 2))