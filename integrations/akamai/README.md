# Netacea Akamai
![Netacea Header](https://assets.ntcacdn.net/header.jpg)

[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

`@netacea/akamai` is a package designed to add [Netacea](https://netacea.com) functionality to [Akamai](https://www.akamai.com/).
In this short readme you will find guidance on implementation and validity checking.

# Installation
### 🌻 Starting fresh
To get started run this command in the main folder:

```shell
npm i 
```

After installation is completed, follow the `README.md` in the [javascriptATAintegration-examples-akamai](https://github.com/Netacea/JavascriptATAIntegration/tree/master/Examples/Akamai) repository to get the integration deployed.

### ⚙️Automatic deployment
Code can be deployed automatically to Akamai by using Github Actions.
* (UAT) Main Worker can be deployed to by merging to [master branch](https://github.com/Netacea/JavascriptATAIntegration).
* (UAT) Nightly Worker can be deployed to by merging to [latest branch](https://github.com/Netacea/JavascriptATAIntegration/tree/latest)

### 🧪 Testing
There are three commands available for testing.

To launch all tests run:
```shell
npm t
```

To launch unit tests run:
```shell
npm run test:unit
```

To launch integration tests run:
```shell
npm run test:integration
```

### 👁️ Linting
To check linting or autofix it run following commands: 
```shell
npm run lint
npm run lint:fix
```