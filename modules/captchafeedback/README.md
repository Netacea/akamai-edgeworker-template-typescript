# Netacea CAPTCHA Feedback
![Netacea Header](https://assets.ntcacdn.net/header.jpg)

[![npm](https://img.shields.io/npm/v/@netacea/captchafeedback.svg)](https://www.npmjs.com/package/@netacea/captchafeedback) &nbsp;
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

`@netacea/captchafeedback` is a package designed to add [Netacea](https://netacea.com) CAPTCHA feedback functionality to your NodeJS based origin server.

# Installation
## NPM
```sh
npm i @netacea/captchafeedback --save
```
## Yarn
```sh
yarn add @netacea/captchafeedback
```

# Usage
```typescript
import Netacea from '@netacea/captchafeedback'
const netacea = new Netacea({
  apiKey: 'your-api-key'
})

const { cookies } = await netacea.updateCaptcha({
  clientIp: 'client-ip',            // Client's real IP address
  cookieHeader: 'cookie-header',    // Incoming cookie header value
  eventId: 'captcha-page-event-id', // X-Netacea-Event-ID received when captcha was served
  result: true,                     // Result from captcha
  userAgent: 'client-user-agent'    // Client's user-agent
})
// TODO: Set cookies to response from cookies object above
// cookies.forEach(cookie => { response.setHeader('set-cookie', cookie) })
```
