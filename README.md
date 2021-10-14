# Akamai Edgeworker Integration

An Akamai integration has to be a pair of files (`main.js` and `bundle.json`), as documented here:

[Akamai EdgeWorker bundle documentation](https://techdocs.akamai.com/edgeworkers/docs/create-a-code-bundle)

# Prerequisites

You will need:
- The Akamai CLI (included in the devcontainer of this repo)
- To be logged in with the CLI to your akamai account (TODO: Find a documentation link)
- A property setup in Akamai where the edgeworker will be deployed
  - This property **must** used Enhanced TLS in Akamai, or the edgeworker will not be called.

## Running a sandbox
Note: This container assumes you already have a `.edgerc` file at `${env:HOME}${env:USERPROFILE}/.edgerc`, configured per the [Akamai Documentation](https://developer.akamai.com/api/getting-started#edgercfile).

- Run `akamai install sandbox` to install the tooling
- Run `akamai sandbox create --name YOUR-SANDBOX-NAME --hostname www.yourhostname.com` to create the sandbox
  - NB: This requires you to have a property setup already with this hostname
- Run `akamai sandbox start` to run the sandbox, which will be available on port `9550`
- Update yout `hosts` file to point `www.yourhostname.com` at `127.0.0.1`

## Setting up an edgeworker and assigning to the property - Console
- Create and edgeworker ID
  - Open Edgeworkers Management
  - Click 'Create EdgeWorker ID'
  - Give the Edgeworker a name, assign it to the group containing your property, and give it the `Dynamic Compute` Resource tier.
  - Set the npm `package.json` with the edgeworker ID
- Setup Akamai property configuration
  - Open the property
  - Create or Select your property version
  - Add a Rule
    - Critera: Add any filtering you want to paths which the edgeworker should apply to
    - Behaviors: 
        - Add the "Allow POST" behavior
        - Edgeworkers: Enable, and select the idenfier of your new edgeworker.
- Push property configuration to your sandbox
  - Click the "Push to Sandbox" button in the header of "Property Configuration Settings"
  - Select your sandbox

## Setting up an edgeworker and assigning to the property - CLI
TODO: Need to investigate this

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

## Developer note

Sometimes, the sandbox doesn't immediately pickup the configuration from the remote - if you find your edgeworker is being ignored in the sandbox, try restarting your sandbox a few times.