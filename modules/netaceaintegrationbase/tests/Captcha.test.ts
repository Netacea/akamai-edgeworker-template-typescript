import * as tape from 'tape'
import * as sinon from 'sinon'
import {
  checkMitataCookieSet,
  mitataCookieValues,
  defaultSecret as secretKey,
  defaultSecret
} from './Helpers'
import NetaceaBase, {
  InjectResponse,
  MakeRequestArgs,
  MakeRequestResponse,
  MitigateResponse,
  NetaceaMitigationType
} from '../src'

class NetaceaTestBase extends NetaceaBase {
  // eslint-disable-next-line @typescript-eslint/require-await
  async makeRequest (args: MakeRequestArgs): Promise<MakeRequestResponse> {
    throw new Error('Method not implemented.')
  }

  // eslint-disable-next-line @typescript-eslint/promise-function-async
  mitigate (...args: any[]): Promise<MitigateResponse<any>> {
    throw new Error('Method not implemented.')
  }

  // eslint-disable-next-line @typescript-eslint/promise-function-async
  ingest (...args: any[]): Promise<any> {
    throw new Error('Method not implemented.')
  }

  // eslint-disable-next-line @typescript-eslint/promise-function-async
  inject (...args: any[]): Promise<any> {
    throw new Error('Method not implemented.')
  }

  getCookieHeader (args: any): string | null {
    throw new Error('Method not implemented.')
  }
}

// eslint-disable-next-line max-lines-per-function
tape('NetaceaBase :: Process Captcha calls successfully', async (t: tape.Test) => {
  t.plan(6)
  const makeRequestStub = sinon.fake()
  const captchaCookieValue = 'abc'
  const captchaCookieExpiry = 86400
  class Base extends NetaceaTestBase {
    async makeRequest (args: MakeRequestArgs): Promise<MakeRequestResponse> {
      makeRequestStub(args)
      return await Promise.resolve({
        headers: {
          'x-netacea-mitatacaptcha-value': captchaCookieValue,
          'x-netacea-mitatacaptcha-expiry': captchaCookieExpiry.toString(),
          'x-netacea-mitata-expiry': '86400',
          'x-netacea-match': '2',
          'x-netacea-mitigate': '1',
          'x-netacea-captcha': '2'
        },
        status: 200
      })
    }
  }

  const apiKey = 'apikey'
  const worker = new Base({
    mitigationType: NetaceaMitigationType.MITIGATE,
    apiKey,
    secretKey
  })
  const ip = '255.255.255.255'
  const userAgent = 'userAgent'
  const captchaData = 'captcha=data'
  // @ts-ignore - processCaptcha is just private
  const captchaResult = await worker.processCaptcha(mitataCookieValues.captcha.ip, ip, userAgent, captchaData)
  t.deepEquals(makeRequestStub.firstCall.args[0], {
    host: 'https://mitigations.netacea.net',
    path: '/AtaVerifyCaptcha',
    headers: {
      'X-Netacea-API-Key': apiKey,
      'X-Netacea-Client-IP': ip,
      'user-agent': userAgent,
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Netacea-UserId': 'uid-captcha-ip'
    },
    method: 'POST',
    body: captchaData,
    timeout: 3000
  }, 'Expects makeRequest to be called with args')

  const cookiesSet = captchaResult.setCookie
  captchaResult.setCookie = []

  t.deepEquals(captchaResult, {
    body: undefined,
    apiCallStatus: 200,
    setCookie: [],
    sessionStatus: 'ip_blocked,captcha_pass',
    mitigation: 'captchapass',
    mitigated: true
  }, 'Expects response to be correct')

  const mitataCookie = cookiesSet.find(cookie => cookie.startsWith('_mitata='))
  const mitataCaptchaCookie = cookiesSet.find(cookie => cookie.startsWith('_mitatacaptcha='))
  t.equal(
    mitataCaptchaCookie,
    `_mitatacaptcha=${captchaCookieValue}; Max-Age=${captchaCookieExpiry}; Path=/`,
    'Correct mitatacatpcha cookie is set'
  )

  const checkedCookie = checkMitataCookieSet(mitataCookie, '255.255.255.255', defaultSecret)

  t.equal(checkedCookie?.isPrimaryHashValid, true, 'mitata is valid')
  t.equal(checkedCookie?.mitata?.userId, 'uid-captcha-ip', 'Correct User ID')
  t.equal(checkedCookie?.mitata?.mitigationType, '212', 'mitata is captcha pass')
})

tape('NetaceaBase :: Process captcha fails when non 200 status code returned', async (t: tape.Test) => {
  t.plan(2)
  const makeRequestStub = sinon.fake()
  class Base extends NetaceaTestBase {
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    inject (...args: any[]): Promise<InjectResponse> {
      throw new Error('Method not implemented.')
    }

    async makeRequest (args: MakeRequestArgs): Promise<MakeRequestResponse> {
      makeRequestStub(args)
      return await Promise.resolve({
        headers: {},
        status: 500
      })
    }
  }

  const worker = new Base({
    mitigationType: NetaceaMitigationType.MITIGATE,
    apiKey: 'test',
    secretKey: ''
  })
  try {
    // @ts-ignore - processCaptcha is just private
    await worker.processCaptcha('', '255.255.255.255', 'useragnet', 'data')
    t.fail('Error not thrown')
  } catch (e) {
    t.equals(makeRequestStub.callCount, 1, 'Expects make request to be called')
    t.equals(e.message, 'Error reaching Netacea API (Server error), status: 500', 'Expects correct error')
  }
})

tape('NetaceaBase :: Process captcha fails when makeRequest throws error', async (t: tape.Test) => {
  t.plan(2)
  const makeRequestStub = sinon.fake()
  const errorMessage = 'Error Message from MakeRequest'
  class Base extends NetaceaTestBase {
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    inject (...args: any[]): Promise<InjectResponse> {
      throw new Error('Method not implemented.')
    }

    async makeRequest (args: MakeRequestArgs): Promise<MakeRequestResponse> {
      makeRequestStub(args)
      return await Promise.reject(new Error(errorMessage))
    }
  }

  const worker = new Base({
    mitigationType: NetaceaMitigationType.MITIGATE,
    apiKey: 'test',
    secretKey: ''
  })
  try {
    // @ts-ignore - processCaptcha is just private
    await worker.processCaptcha('', '255.255.255.255', 'useragnet', 'data')
    t.fail('Error not thrown')
  } catch (e) {
    t.equals(makeRequestStub.callCount, 1, 'Expects make request to be called')
    t.equals(e.message, errorMessage, 'Expects error to surface')
  }
})

// eslint-disable-next-line max-lines-per-function
tape('NetaceaBase :: processCaptcha sends catpcha keys in headers when provided', async (t: tape.Test) => {
  t.plan(1)
  const makeRequestStub = sinon.fake()
  class Base extends NetaceaTestBase {
    async makeRequest (args: MakeRequestArgs): Promise<MakeRequestResponse> {
      makeRequestStub(args)
      return await Promise.resolve({
        headers: {},
        status: 200
      })
    }
  }

  const apiKey = 'apikey'
  const captchaSiteKey = 'captcha-site-key'
  const captchaSecretKey = 'captcha-secret-key'

  const worker = new Base({
    mitigationType: NetaceaMitigationType.MITIGATE,
    apiKey,
    secretKey,
    captchaSiteKey,
    captchaSecretKey
  })
  const ip = '255.255.255.255'
  const userAgent = 'userAgent'
  const captchaData = 'captcha=data'

  // @ts-ignore - processCaptcha is just private
  await worker.processCaptcha(mitataCookieValues.captcha.ip, ip, userAgent, captchaData)

  t.deepEquals(makeRequestStub.firstCall.args[0], {
    host: 'https://mitigations.netacea.net',
    path: '/AtaVerifyCaptcha',
    headers: {
      'X-Netacea-API-Key': apiKey,
      'X-Netacea-Client-IP': ip,
      'user-agent': userAgent,
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Netacea-UserId': 'uid-captcha-ip',
      'X-Netacea-Captcha-Site-Key': captchaSiteKey,
      'X-Netacea-Captcha-Secret-Key': captchaSecretKey
    },
    method: 'POST',
    body: captchaData,
    timeout: 3000
  }, 'Expects makeRequest to be called with args')
})

// eslint-disable-next-line max-lines-per-function
tape('NetaceaBase :: processCaptcha does not send catpcha keys if secret key is missing', async (t: tape.Test) => {
  t.plan(1)
  const makeRequestStub = sinon.fake()
  class Base extends NetaceaTestBase {
    async makeRequest (args: MakeRequestArgs): Promise<MakeRequestResponse> {
      makeRequestStub(args)
      return await Promise.resolve({
        headers: {},
        status: 200
      })
    }
  }

  const apiKey = 'apikey'
  const captchaSiteKey = 'captcha-site-key'

  const worker = new Base({
    mitigationType: NetaceaMitigationType.MITIGATE,
    apiKey,
    secretKey,
    captchaSiteKey
  })
  const ip = '255.255.255.255'
  const userAgent = 'userAgent'
  const captchaData = 'captcha=data'

  // @ts-ignore - processCaptcha is just private
  await worker.processCaptcha(mitataCookieValues.captcha.ip, ip, userAgent, captchaData)

  t.deepEquals(makeRequestStub.firstCall.args[0], {
    host: 'https://mitigations.netacea.net',
    path: '/AtaVerifyCaptcha',
    headers: {
      'X-Netacea-API-Key': apiKey,
      'X-Netacea-Client-IP': ip,
      'user-agent': userAgent,
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Netacea-UserId': 'uid-captcha-ip'
    },
    method: 'POST',
    body: captchaData,
    timeout: 3000
  }, 'Expects makeRequest to be called with args')
})

// eslint-disable-next-line max-lines-per-function
tape('NetaceaBase :: processCaptcha does not send catpcha keys if site key is missing', async (t: tape.Test) => {
  t.plan(1)
  const makeRequestStub = sinon.fake()
  class Base extends NetaceaTestBase {
    async makeRequest (args: MakeRequestArgs): Promise<MakeRequestResponse> {
      makeRequestStub(args)
      return await Promise.resolve({
        headers: {},
        status: 200
      })
    }
  }

  const apiKey = 'apikey'
  const captchaSecretKey = 'captcha-secret-key'

  const worker = new Base({
    mitigationType: NetaceaMitigationType.MITIGATE,
    apiKey,
    secretKey,
    captchaSecretKey
  })
  const ip = '255.255.255.255'
  const userAgent = 'userAgent'
  const captchaData = 'captcha=data'

  // @ts-ignore - processCaptcha is just private
  await worker.processCaptcha(mitataCookieValues.captcha.ip, ip, userAgent, captchaData)

  t.deepEquals(makeRequestStub.firstCall.args[0], {
    host: 'https://mitigations.netacea.net',
    path: '/AtaVerifyCaptcha',
    headers: {
      'X-Netacea-API-Key': apiKey,
      'X-Netacea-Client-IP': ip,
      'user-agent': userAgent,
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Netacea-UserId': 'uid-captcha-ip'
    },
    method: 'POST',
    body: captchaData,
    timeout: 3000
  }, 'Expects makeRequest to be called with args')
})
