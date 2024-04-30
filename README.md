# Netacea Akamai EdgeWorker Template

![Netacea Header](https://assets.ntcacdn.net/header.jpg)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

A simple Akamai EdgeWorker with Netacea built in.

## Running a sandbox
If you would like to run a sandbox please refer to the [official Akamai documentation](https://developer.akamai.com/tools/akamai-sandbox) where you can find proper instructions.

## Developer note

Sometimes, the sandbox doesn't immediately pickup the configuration from the remote - if you find your edgeworker is being ignored in the sandbox, try restarting your sandbox a few times.

## 💻 Developing
If you need to extend or enhance the functionality of the Akamai EdgeWorker, the documentation can be found [here](https://developer.akamai.com/akamai-edgeworkers-overview).
Code extensions should be made in `./src/index.ts`.

Please ensure that as a minumum your `onClientRequest` handler contains:
```javascript
await worker.requestHandler(request)
```
and your `onClientResponse` handler contains:
```javascript
 await worker.responseHandler(request, response)
```

## Creating the Akamai Bundle
The edgeworker requires a code bundle with a main.js file and a bundle.js that defines the version. You need to have created a src/config.js file with your configuration details. Then update the bundle.js with an appropriate version and description for your bundle. Finally run the following commands at the root level of this repository.

```bash
npm i
npm run ewbundle
```

## ❗ Issues
If you run into issues with this specific project, please feel free to file an issue [here](https://github.com/Netacea/akamai-edgeworker-template-typescript/issues).
