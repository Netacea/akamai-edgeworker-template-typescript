# Akamai Edgeworker Integration

An Akamai integration has to be a pair of files (`main.js` and `bundle.json`), as documented here:

[Akamai EdgeWorker bundle documentation](https://techdocs.akamai.com/edgeworkers/docs/create-a-code-bundle)

## Running a sandbox
Note: This container assumes you already have a `.edgerc` file at `${env:HOME}${env:USERPROFILE}/.edgerc`, configured per the [Akamai Documentation](https://developer.akamai.com/api/getting-started#edgercfile).

- Run `akamai install sandbox` to install the tooling
- Run `akamai sandbox create --name YOUR-SANDBOX-NAME --hostname www.yourhostname.com` to create the sandbox
- Run `akamai sandbox start` to run the sandbox, which will be available on port `9550`
- Update yout `hosts` file to point `www.yourhostname.com` at `127.0.0.1`

## Setting up a configuration and assigning an edge worker
TODO: Flesh this out - maybe can be done with the CLI?
- Setup Akamai property configuration
- Add an edge worker with a new id
- Add edgeworker to configuration
- Set the npm `package.json` with the edgeworker ID
- Push property configuration to your sandbox

## Deploying the worker to your sandbox

- Run `npm run bundle` to create your bundled webworker
- TODO: Create a bundle.json in a nice way
- Run `akamai sandbox add-edgeworker $EDGEWORKER_ID ./bundle/edgeworker.tgz` to add the bundle to the sandbox
- Run `akamai sandbox start`

## Updating the worker on your sandbox

- Run `npm run bundle` to create your bundled webworker
- TODO: Create a bundle.json in a nice way
- Run `akamai sandbox update-edgeworker $EDGEWORKER_ID ./bundle/edgeworker.tgz` to update the bundle on the edgeworker
- Run `akamai sandbox start`