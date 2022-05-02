# Netacea Kinesis Ingest
![Netacea Header](https://assets.ntcacdn.net/header.jpg)

[![npm](https://img.shields.io/npm/v/@netacea/captchafeedback.svg)](https://www.npmjs.com/package/@netacea/captchafeedback) &nbsp;
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

`@netacea/kinesisingest` is a package designed to add [Netacea](https://netacea.com) Kinesis feedback functionality to your javascript based intergration.

# Installation
## NPM
```sh
npm i @netacea/kinesisingest --save
```
## Yarn
```sh
yarn add @netacea/kinesisingest
```

# Usage
```typescript
import NetaceaKinesis from '@netacea/kinesisingest'
const netacea = new NetaceaKinesis({
  kinesisStreamName: 'YOUR-NETACEA-KINESIS-STREAM-NAME',
  kinesisAccessKey: 'YOUR-NETACEA-KINESIS-ACCESS-KEY',
  kinesisSecretKey: 'YOUR-NETACEA-KINESIS-SECRET-KEY', //OPTIONAL - if secretsManagerSecretId is provided
  secretsManagerSecretId: 'YOUR-OWN-SECRET-MANAGER-SECRET-ID',
  apiKey: 'YOUR-NETACEA-API-KEY'
})

await kinesis.ingest({
  key: 'value'
})
```
