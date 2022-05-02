/* eslint-disable max-lines */
import NetaceaBase, {
  ComposeResultResponse,
  MakeRequestArgs,
  MakeRequestResponse,
  MitigateResponse,
  NetaceaMitigationType,
  NetaceaResponseBase,
  InjectResponse
} from '../src'
import * as tape from 'tape'
import * as sinon from 'sinon'
import { defaultSecret as secretKey, mitataCookieValues, buildMitata } from './Helpers'
const apiKey = 'apiKey'

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
tape('NetaceaBase :: Check :: Correctly returns response from injected makeRequest', async (t: tape.Test) => {
  t.plan(3)
  const ipAddress = '255.255.255.255'
  const userAgent = 'user-agent'
  const userId = 'some-user-id'
  const startingMitata = buildMitata({
    userId,
    expiry: Math.floor(Date.now() / 1000) - 60
  })

  const expectedMaxAge = 86401
  const expectedMitataCookie = buildMitata({
    userId,
    type: '000'
  })

  const makeRequestStub = sinon.fake()
  class Base extends NetaceaTestBase {
    async makeRequest (args: MakeRequestArgs): Promise<MakeRequestResponse> {
      makeRequestStub(args)
      return await Promise.resolve({
        headers: {
          'x-netacea-match': '0',
          'x-netacea-mitigate': '0',
          'x-netacea-captcha': '0',
          'x-netacea-mitata-value': 'this-should-be-ignored',
          'x-netacea-mitata-expiry': String(expectedMaxAge)
        },
        status: 200,
        body: undefined
      })
    }

    public async callCheck (netaceaCookie: string | undefined,
      clientIP: string,
      userAgent: string,
      captchaCookie?: string): Promise<ComposeResultResponse> {
      return await this.check(netaceaCookie, clientIP, userAgent, captchaCookie)
    }
  }

  const worker = new Base({
    mitigationType: NetaceaMitigationType.MITIGATE,
    apiKey,
    secretKey
  })
  const check = await worker.callCheck(startingMitata, ipAddress, userAgent, undefined)
  t.equals(makeRequestStub.callCount, 1, 'Expects one call to makeRequest')
  t.deepEquals(makeRequestStub.firstCall.args[0], {
    host: 'https://mitigations.netacea.net',
    path: '/',
    headers: {
      'X-Netacea-API-Key': apiKey,
      'X-Netacea-Client-IP': ipAddress,
      'user-agent': userAgent,
      'cookie': '',
      'X-Netacea-UserId': userId
    },
    method: 'GET',
    timeout: 3000
  }, 'Expects correct args to make request')

  t.deepEquals(check, {
    body: undefined,
    apiCallStatus: 200,
    setCookie: [`_mitata=${expectedMitataCookie}; Max-Age=${expectedMaxAge}; Path=/`],
    sessionStatus: '',
    mitigation: '',
    mitigated: false
  })
})
tape('NetaceaBase :: Check :: Correctly returns response from injected makeRequest when mitigationType is inject',
  // eslint-disable-next-line max-lines-per-function
  async (t: tape.Test) => {
    t.plan(3)
    const userAgent = 'user-agent'
    const ipAddress = '255.255.255.255'
    const userId = 'some-user-id'

    const startingMitata = buildMitata({
      clientIP: ipAddress,
      userId,
      expiry: Math.floor(Date.now() / 1000) - 60
    })

    const expectedMaxAge = 86402
    const expectedMitataCookie = buildMitata({
      clientIP: ipAddress,
      userId,
      type: '000'
    })

    const makeRequestStub = sinon.fake()
    class Base extends NetaceaTestBase {
      async makeRequest (args: MakeRequestArgs): Promise<MakeRequestResponse> {
        makeRequestStub(args)
        return await Promise.resolve({
          headers: {
            'x-netacea-match': '0',
            'x-netacea-mitigate': '0',
            'x-netacea-captcha': '0',
            'x-netacea-mitata-value': 'this-should-be-ignored',
            'x-netacea-mitata-expiry': String(expectedMaxAge)
          },
          status: 200,
          body: undefined
        })
      }

      public async callCheck (netaceaCookie: string | undefined,
        clientIP: string,
        userAgent: string,
        captchaCookie?: string): Promise<ComposeResultResponse> {
        return await this.check(netaceaCookie, clientIP, userAgent, captchaCookie)
      }
    }

    const worker = new Base({
      mitigationType: NetaceaMitigationType.INJECT,
      apiKey,
      secretKey
    })
    const check = await worker.callCheck(startingMitata, ipAddress, userAgent, undefined)
    t.equals(makeRequestStub.callCount, 1, 'Expects one call to makeRequest')
    t.deepEquals(makeRequestStub.firstCall.args[0], {
      host: 'https://mitigations.netacea.net',
      path: '/',
      headers: {
        'X-Netacea-API-Key': apiKey,
        'X-Netacea-Client-IP': ipAddress,
        'user-agent': userAgent,
        'cookie': '',
        'X-Netacea-UserId': userId
      },
      method: 'GET',
      timeout: 3000
    }, 'Expects correct args to make request')

    t.deepEquals(check, {
      body: undefined,
      apiCallStatus: 200,
      setCookie: [`_mitata=${expectedMitataCookie}; Max-Age=${expectedMaxAge}; Path=/`],
      sessionStatus: '',
      mitigation: '',
      mitigated: false,
      injectHeaders: {
        'x-netacea-match': '0',
        'x-netacea-mitigate': '0',
        'x-netacea-captcha': '0'
      }
    })
  })

tape('NetaceaBase :: Check :: Throws error if makeRequest throws error', async (t: tape.Test) => {
  t.plan(2)
  const errorMessage = 'Error from makeRequest'
  const makeRequestStub = sinon.fake()
  class Base extends NetaceaBase {
    async makeRequest (args: MakeRequestArgs): Promise<MakeRequestResponse> {
      makeRequestStub(args)
      return await Promise.reject(new Error(errorMessage))
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

    public async callCheck (netaceaCookie: string | undefined,
      clientIP: string,
      userAgent: string,
      captchaCookie?: string): Promise<ComposeResultResponse> {
      return await this.check(netaceaCookie, clientIP, userAgent, captchaCookie)
    }
  }
  const worker = new Base({
    mitigationType: NetaceaMitigationType.MITIGATE,
    apiKey: 'key',
    secretKey: 'secret'
  })
  try {
    await worker.callCheck('cookie', '255.255.255.255', 'useragent')
    t.fail('Error not thrown')
  } catch (err) {
    t.equals((err as Error).message, errorMessage, 'Expects error message to surface')
    t.equals(makeRequestStub.callCount, 1, 'Expects makeRequest to be called')
  }
})

// eslint-disable-next-line max-lines-per-function
tape('NetaceaBase :: Check :: Throws error if makeRequest returns anything other than 200', async (t: tape.Test) => {
  t.plan(2)
  const errorMessage = 'Error reaching Netacea API (Invalid credentials), status: 403'
  const makeRequestStub = sinon.fake()
  class Base extends NetaceaTestBase {
    async makeRequest (args: MakeRequestArgs): Promise<MakeRequestResponse> {
      makeRequestStub(args)
      return await Promise.resolve({
        status: 403,
        headers: {}
      })
    }

    public async callCheck (netaceaCookie: string | undefined,
      clientIP: string,
      userAgent: string,
      captchaCookie?: string): Promise<ComposeResultResponse> {
      return await this.check(netaceaCookie, clientIP, userAgent, captchaCookie)
    }
  }

  const worker = new Base({
    mitigationType: NetaceaMitigationType.MITIGATE,
    apiKey: 'key',
    secretKey: 'secret'
  })
  try {
    await worker.callCheck('cookie', '255.255.255.255', 'useragent')
    t.fail('Error not thrown')
  } catch (err) {
    t.equals((err as Error).message, errorMessage, 'Expects error message to surface')
    t.equals(makeRequestStub.callCount, 1, 'Expects makeRequest to be called')
  }
})

tape('NetaceaBase :: Check :: Throws error if secretKey is not provided and check is called', async (t: tape.Test) => {
  t.plan(1)
  class Base extends NetaceaTestBase {
    async makeRequest (args: MakeRequestArgs): Promise<MakeRequestResponse> {
      return await Promise.reject(new Error('Method not implemented'))
    }

    public async callCheck (netaceaCookie: string | undefined,
      clientIP: string,
      userAgent: string,
      captchaCookie?: string): Promise<ComposeResultResponse> {
      return await this.check(netaceaCookie, clientIP, userAgent, captchaCookie)
    }
  }

  const worker = new Base({
    mitigationType: NetaceaMitigationType.MITIGATE,
    apiKey: 'key'
  })
  try {
    await worker.callCheck('cookie', '255.255.255.255', 'useragent')
    t.fail('Error not thrown')
  } catch (err) {
    t.equals((err as Error).message, 'Secret key is required to mitigate')
  }
})

// eslint-disable-next-line max-lines-per-function
tape('NetaceaBase :: Check :: Does not call makeRequest when cookie is valid', async (t: tape.Test) => {
  t.plan(1)
  class Base extends NetaceaBase {
    async makeRequest (args: MakeRequestArgs): Promise<MakeRequestResponse> {
      return await Promise.reject(new Error('Method not implemented'))
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

    public async callCheck (netaceaCookie: string | undefined,
      clientIP: string,
      userAgent: string,
      captchaCookie?: string): Promise<ComposeResultResponse> {
      return await this.check(netaceaCookie, clientIP, userAgent, captchaCookie)
    }
  }

  try {
    const worker = new Base({
      mitigationType: NetaceaMitigationType.MITIGATE,
      apiKey,
      secretKey
    })
    const result = await worker.callCheck(mitataCookieValues.valid, '255.255.255.255', 'userAgent')
    t.deepEquals(result, {
      body: undefined,
      apiCallStatus: -1,
      setCookie: [],
      sessionStatus: '',
      mitigation: '',
      mitigated: false
    }, 'Expects correct response')
  } catch (e) {
    t.fail('Does not expect error')
  }
})

// eslint-disable-next-line max-lines-per-function
tape('NetaceaBase :: Check :: Calls makeRequest when cookie is valid, but expired', async (t: tape.Test) => {
  t.plan(1)
  const makeRequestStub = sinon.fake()

  const userId = 'some-user-id'

  const startingMitata = buildMitata({
    userId,
    expiry: Math.floor(Date.now() / 1000) - 60
  })

  const expectedMaxAge = 86403
  const expectedMitataCookie = buildMitata({
    userId,
    type: '130'
  })

  class Base extends NetaceaTestBase {
    async makeRequest (args: MakeRequestArgs): Promise<MakeRequestResponse> {
      makeRequestStub(args)
      return await Promise.resolve({
        headers: {
          'x-netacea-match': '1',
          'x-netacea-mitigate': '3',
          'x-netacea-captcha': '0',
          'x-netacea-mitata-value': 'this-should-be-ignored',
          'x-netacea-mitata-expiry': String(expectedMaxAge)
        },
        status: 200,
        body: undefined
      })
    }

    public async callCheck (netaceaCookie: string | undefined,
      clientIP: string,
      userAgent: string,
      captchaCookie?: string): Promise<ComposeResultResponse> {
      return await this.check(netaceaCookie, clientIP, userAgent, captchaCookie)
    }
  }

  try {
    const worker = new Base({
      mitigationType: NetaceaMitigationType.MITIGATE,
      apiKey,
      secretKey
    })
    const result = await worker.callCheck(startingMitata, '255.255.255.255', 'userAgent')
    t.deepEquals(result, {
      body: undefined,
      apiCallStatus: 200,
      setCookie: [`_mitata=${expectedMitataCookie}; Max-Age=${expectedMaxAge}; Path=/`],
      sessionStatus: 'ua_hardblocked',
      mitigation: 'block',
      mitigated: true
    }, 'Expects correct response')
  } catch (e) {
    t.fail('Does not expect error')
  }
})

// eslint-disable-next-line max-lines-per-function
tape('NetaceaBase :: runMitigation calls correct function', async (t: tape.Test) => {
  t.plan(7)
  const mitigateStub = sinon.fake()
  const injectStub = sinon.fake()
  const processIngestStub = sinon.fake()
  class Base extends NetaceaTestBase {
    async mitigate (...args: any[]): Promise<MitigateResponse<any>> {
      mitigateStub(...args)
      return await Promise.resolve({
        sessionStatus: ''
      })
    }

    async inject (...args: any[]): Promise<any> {
      injectStub(...args)
      return await Promise.resolve()
    }

    processIngest (...args: any): NetaceaResponseBase {
      processIngestStub(...args)
      return {
        sessionStatus: '',
        setCookie: []
      }
    }
  }

  const mitWorker = new Base({
    apiKey: 'api',
    secretKey: 'secretKey',
    mitigationType: NetaceaMitigationType.MITIGATE
  })
  const injectWorker = new Base({
    apiKey: 'api',
    secretKey: 'secretKey',
    mitigationType: NetaceaMitigationType.INJECT
  })
  // undefined mit type defaults to INGEST
  const undefinedWorker = new Base({
    apiKey: 'api',
    secretKey: 'secretKey',
    mitigationType: undefined
  })
  const nonExistentWorker = new Base({
    apiKey: 'api',
    secretKey: 'secretKey',
    // @ts-ignore - ignoring type sanity, just incase javascript user
    mitigationType: 'notaMitigationType'
  })

  const ingestWorker = new Base({
    apiKey: 'api',
    secretKey: 'secretKey',
    mitigationType: NetaceaMitigationType.INGEST
  })

  await injectWorker.runMitigation('inject')
  await mitWorker.runMitigation('mitigate')
  await ingestWorker.runMitigation('ingest')
  await undefinedWorker.runMitigation('undefinedWorker')

  t.equals(injectStub.callCount, 1, 'Expects inject to be called once')
  t.equals(injectStub.firstCall.firstArg, 'inject', 'Expects correct arg')
  t.equals(mitigateStub.callCount, 1, 'Expects mitigate to be called once')
  t.equals(mitigateStub.firstCall.firstArg, 'mitigate', 'Expects correct arg')
  t.equals(processIngestStub.callCount, 2, 'Expects ingest to be called twice')
  t.equals(processIngestStub.firstCall.firstArg, 'ingest', 'Expects correct arg')

  const logSpy = sinon.spy(console, 'error')
  await nonExistentWorker.runMitigation('fake')
  t.ok(logSpy.firstCall.lastArg.message.includes('Mitigation type notaMitigationType not recognised'))
  logSpy.restore()
})

// eslint-disable-next-line max-lines-per-function
tape('NetaceaBase :: Sends catpcha keys in headers when provided', async (t: tape.Test) => {
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

  // @ts-ignore - processCaptcha is just private
  await worker.check(undefined, ip, userAgent)

  t.deepEquals(makeRequestStub.firstCall.args[0], {
    host: 'https://mitigations.netacea.net',
    path: '/',
    headers: {
      'X-Netacea-API-Key': apiKey,
      'X-Netacea-Client-IP': ip,
      'user-agent': userAgent,
      'cookie': '',
      'X-Netacea-Captcha-Site-Key': captchaSiteKey,
      'X-Netacea-Captcha-Secret-Key': captchaSecretKey
    },
    method: 'GET',
    timeout: 3000
  }, 'Expects makeRequest to be called with args')
})

// eslint-disable-next-line max-lines-per-function
tape('NetaceaBase :: Does not send catpcha keys in headers if secret key is missing', async (t: tape.Test) => {
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

  // @ts-ignore - processCaptcha is just private
  await worker.check(undefined, ip, userAgent)

  t.deepEquals(makeRequestStub.firstCall.args[0], {
    host: 'https://mitigations.netacea.net',
    path: '/',
    headers: {
      'X-Netacea-API-Key': apiKey,
      'X-Netacea-Client-IP': ip,
      'user-agent': userAgent,
      'cookie': ''
    },
    method: 'GET',
    timeout: 3000
  }, 'Expects makeRequest to be called with args')
})

// eslint-disable-next-line max-lines-per-function
tape('NetaceaBase :: Does not send catpcha keys in headers if site key is missing', async (t: tape.Test) => {
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

  // @ts-ignore - processCaptcha is just private
  await worker.check(undefined, ip, userAgent)

  t.deepEquals(makeRequestStub.firstCall.args[0], {
    host: 'https://mitigations.netacea.net',
    path: '/',
    headers: {
      'X-Netacea-API-Key': apiKey,
      'X-Netacea-Client-IP': ip,
      'user-agent': userAgent,
      'cookie': ''
    },
    method: 'GET',
    timeout: 3000
  }, 'Expects makeRequest to be called with args')
})

tape('NetaceaBase :: Fails open on mitigate error', async (t: tape.Test) => {
  const errorMessage = 'Thrown error'
  class Test extends NetaceaBase {
    // eslint-disable-next-line  @typescript-eslint/promise-function-async
    protected makeRequest (args: MakeRequestArgs): Promise<MakeRequestResponse> {
      throw new Error('Method not implemented.')
    }

    // eslint-disable-next-line  @typescript-eslint/promise-function-async
    protected mitigate (args: any): Promise<MitigateResponse<any>> {
      throw new Error(errorMessage)
    }

    // eslint-disable-next-line  @typescript-eslint/promise-function-async
    protected inject (args: any): Promise<InjectResponse<any>> {
      throw new Error('Method not implemented.')
    }

    // eslint-disable-next-line  @typescript-eslint/promise-function-async
    ingest (...args: any[]): Promise<any> {
      throw new Error('Method not implemented.')
    }

    getCookieHeader (args: any): string | null | undefined {
      throw new Error('Method not implemented.')
    }
  }
  const spy = sinon.spy(console, 'error')
  const worker = new Test({
    apiKey: 'a',
    secretKey: 'b',
    mitigationType: NetaceaMitigationType.MITIGATE
  })
  try {
    await worker.runMitigation({})
    t.equals(spy.firstCall.lastArg.message, errorMessage, 'Expects correct error message')
  } catch (e) {
    t.fail('Error thrown unexpectedly', e)
  } finally {
    spy.restore()
  }
})
