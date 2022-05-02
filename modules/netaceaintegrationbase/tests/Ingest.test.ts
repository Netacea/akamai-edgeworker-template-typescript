import * as tape from 'tape'
import * as sinon from 'sinon'
import NetaceaBase, {
  IngestArgs,
  MakeRequestArgs,
  MakeRequestResponse,
  MitigateResponse,
  NetaceaMitigationType,
  NetaceaResponseBase,
  NetaceaIngestType,
  WebLog,
  V2WebLog,
  NetaceaLogVersion,
  hexSha256,
  ingestIgnoredIpValue
} from '../src'
import { COOKIEDELIMITER } from 'src/dictionary'
import { mitataCookieValues, buildMitata, defaultSecret } from './Helpers'
const fakeDate = new Date()
const fakeDateOutput = fakeDate.toUTCString()
const payload: IngestArgs = {
  bytesSent: '1',
  ip: '255.255.255.255',
  method: 'GET',
  path: '/path',
  protocol: 'HTTP/1.0',
  referer: '/homepage',
  requestTime: '100',
  status: '200',
  userAgent: 'User-Agent',
  mitataCookie: 'cookieValue',
  sessionStatus: 'ip_blocked,captcha_pass'
}

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
tape('NetaceaBase :: Ingest called successfully', async (t: tape.Test) => {
  const dateStub = sinon.useFakeTimers(fakeDate.getTime())
  const makeRequestFake = sinon.fake()
  class Base extends NetaceaTestBase {
    async makeRequest (args: MakeRequestArgs): Promise<MakeRequestResponse> {
      makeRequestFake(args)
      return await Promise.resolve({
        status: 200,
        headers: {}
      })
    }

    public async callProtectedIngest (args: IngestArgs): Promise<void> {
      return await this.callIngest(args)
    }
  }
  const apiKey = 'apiKey'
  const worker = new Base({
    mitigationType: NetaceaMitigationType.MITIGATE,
    apiKey
  })

  await worker.callProtectedIngest(payload)
  const expected = {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    Request: `${payload.method} ${payload.path} ${payload.protocol}`,
    RealIp: payload.ip,
    UserAgent: payload.userAgent,
    Status: payload.status,
    RequestTime: payload.requestTime,
    BytesSent: payload.bytesSent,
    Referer: payload.referer,
    NetaceaUserIdCookie: payload.mitataCookie,
    NetaceaMitigationApplied: payload.sessionStatus,
    TimeLocal: fakeDateOutput,
    IntegrationType: '',
    IntegrationVersion: ''
  }
  const { host, method, path, headers, body } = makeRequestFake.firstCall.args[0]
  t.equals(host, 'https://ingest.netacea.net', 'Expects host to be correct')
  t.equals(method, 'POST', 'Expects method to be POST')
  t.equals(path, '/', 'Expects path to be /')
  t.deepEquals(headers, {
    'X-Netacea-API-Key': apiKey,
    'content-type': 'application/json'
  })
  t.deepEqual(JSON.parse(body), expected, 'Expects body to be correct')
  dateStub.restore()
})

// eslint-disable-next-line max-lines-per-function
tape('NetaceaBase :: Kinesis Ingest called successfully', async (t: tape.Test) => {
  const makeRequestFake = sinon.fake()
  const sto = global.setTimeout
  // @ts-ignore
  global.setTimeout = (fn: any) => {
    fn()
  }
  class Base extends NetaceaTestBase {
    async makeRequest (args: MakeRequestArgs): Promise<MakeRequestResponse> {
      makeRequestFake(args)
      return await Promise.resolve({
        status: 200,
        headers: {}
      })
    }

    public async callProtectedIngest (args: IngestArgs): Promise<void> {
      return await this.callIngest(args)
    }
  }
  const apiKey = 'apiKey'
  const worker = new Base({
    mitigationType: NetaceaMitigationType.MITIGATE,
    apiKey,
    ingestType: NetaceaIngestType.KINESIS,
    kinesis: {
      kinesisStreamName: 'STREAM-NAME',
      kinesisAccessKey: 'ACCESS-KEY',
      kinesisSecretKey: 'SECRET-KEY'
    }
  })

  await worker.callProtectedIngest(payload)
  const { host, method, path, body } = makeRequestFake.firstCall.args[0]
  t.equals(host, 'https://kinesis.eu-west-1.amazonaws.com', 'Expects host to be correct')
  t.equals(method, 'POST', 'Expects method to be POST')
  t.equals(path, '/', 'Expects path to be /')
  t.deepEqual(JSON.parse(body).StreamName, 'STREAM-NAME', 'Expects stream-name to be correct')
  global.setTimeout = sto
})

tape('NetaceaBase :: Errors when ingest returns non-200 status code', async (t: tape.Test) => {
  t.plan(1)
  class Base extends NetaceaTestBase {
    async makeRequest (args: MakeRequestArgs): Promise<MakeRequestResponse> {
      return await Promise.resolve({
        status: 400,
        headers: {}
      })
    }

    public async callProtectedIngest (args: IngestArgs): Promise<void> {
      return await this.callIngest(args)
    }
  }
  try {
    await new Base({ apiKey: 'api' }).callProtectedIngest(payload)
    t.fail('Error expected')
  } catch (err) {
    t.equals(err.message,
      'Error reaching Netacea API (Invalid request), status: 400',
      'Expects error message to be correct'
    )
  }
})

tape('NetaceaBase :: Errors when makeRequest errors', async (t: tape.Test) => {
  t.plan(1)
  const errorMessage = 'Test error from makeRequest'
  class Base extends NetaceaTestBase {
    async makeRequest (args: MakeRequestArgs): Promise<MakeRequestResponse> {
      return await Promise.reject(new Error(errorMessage))
    }

    public async callProtectedIngest (args: IngestArgs): Promise<void> {
      return await this.callIngest(args)
    }
  }
  try {
    await new Base({ apiKey: 'api' }).callProtectedIngest(payload)
    t.fail('Error expected')
  } catch (err) {
    t.equals(err.message, errorMessage, 'Expects error message to surface from makeRequest')
  }
})

// eslint-disable-next-line max-lines-per-function
tape('NetaceaBase :: processIngest', (t: tape.Test) => {
  const getCookieHeaderStub = sinon.stub()

  class Base extends NetaceaTestBase {
    getCookieHeader (args: any): any {
      return getCookieHeaderStub(args)
    }

    public async callProtectedIngest (args: IngestArgs): Promise<void> {
      return await this.callIngest(args)
    }

    public callProcessIngest (args: any): NetaceaResponseBase {
      return this.processIngest(args)
    }
  }

  const worker = new Base({
    apiKey: 'apiKey',
    secretKey: 'secret',
    mitigationType: NetaceaMitigationType.INGEST
  })

  t.test('will set new cookie if there is no netaceaCookie found in request', (t: tape.Test) => {
    t.plan(8)
    const result = worker.callProcessIngest('ingest')

    if (result.setCookie !== undefined) {
      const [cookie, maxAge, cookiePath] = result.setCookie[0].split('; ')
      const [mitata, expiry, userId, ipHash, ingestValue] = cookie.split(COOKIEDELIMITER)

      const expectedIpHash = hexSha256(ingestIgnoredIpValue + '|' + expiry, defaultSecret)
      t.equals(ipHash, expectedIpHash, 'correct IP + timestamp hash')

      t.true(mitata.includes('_mitata='), '_mitata cookie is set')
      t.true(Number(expiry) > Date.now() / 1000, 'expiry is set in the future')
      t.true(userId.startsWith('c'), 'userId is prefixed with c')
      t.equals(userId.length, 16, 'userId length is correct')
      t.equals(ingestValue, '000', 'ingestValue is 000')
      t.equals(maxAge, 'Max-Age=86400', 'sets cookie max age to 1 day (in seconds)')
      t.equals(cookiePath, 'Path=/', 'sets cookie path correctly')
    }
  })

  t.test('will set new cookie if there is cookie hash does not match', (t: tape.Test) => {
    t.plan(9)
    getCookieHeaderStub.resetBehavior()
    getCookieHeaderStub.returns('_mitata=badhash_/@#/1614250860_/@#/cjz9mzpkrbms5sim_/@#/000; Max-Age=86400; Path=/')

    const result = worker.callProcessIngest('ingest')

    if (result.setCookie !== undefined) {
      const [cookie, maxAge, cookiePath] = result.setCookie[0].split('; ')
      const [mitata, expiry, userId, ipHash, ingestValue] = cookie.split(COOKIEDELIMITER)

      const expectedIpHash = hexSha256(ingestIgnoredIpValue + '|' + expiry, defaultSecret)
      t.equals(ipHash, expectedIpHash, 'correct IP + timestamp hash')

      t.true(mitata.includes('_mitata='), '_mitata cookie is set')
      t.true(Number(expiry) > Date.now() / 1000, 'expiry is set in the future')
      t.true(userId.startsWith('c'), 'userId is prefixed with c')
      t.notEqual(userId, 'cjz9mzpkrbms5sim', 'userId is NOT reused')
      t.equals(userId.length, 16, 'userId length is correct')
      t.equals(ingestValue, '000', 'ingestValue is 000')
      t.equals(maxAge, 'Max-Age=86400', 'sets cookie max age to 1 day (in seconds)')
      t.equals(cookiePath, 'Path=/', 'sets cookie path correctly')
    }
  })

  t.test('will continue to use userId with new cookie if cookie age elapses', (t: tape.Test) => {
    t.plan(7)

    const dateUnixTime = Math.floor(Date.now() / 1000)
    const expectedUserId = 'expectedUserId6234564'
    const expiredCookie = buildMitata({
      userId: expectedUserId,
      expiry: dateUnixTime - 60,
      type: '000'
    })

    getCookieHeaderStub.resetBehavior()
    getCookieHeaderStub.returns(`_mitata=${expiredCookie}; Max-Age=86400; Path=/`)

    const result = worker.callProcessIngest('ingest')

    if (result.setCookie !== undefined) {
      const [cookie, maxAge, cookiePath] = result.setCookie[0].split('; ')
      const [mitata, expiry, userId, ipHash, ingestValue] = cookie.split(COOKIEDELIMITER)

      const expectedIpHash = hexSha256(ingestIgnoredIpValue + '|' + expiry, defaultSecret)
      t.equals(ipHash, expectedIpHash, 'correct IP + timestamp hash')

      t.true(mitata.includes('_mitata='), '_mitata cookie is set')
      t.equals(expiry, (dateUnixTime + 60 * 60).toString(), 'expiry is set correctly')
      t.equals(userId, expectedUserId, 'userId is reused')
      t.equals(ingestValue, '000', 'ingestValue is 000')
      t.equals(maxAge, 'Max-Age=86400', 'sets cookie max age to 1 day (in seconds)')
      t.equals(cookiePath, 'Path=/', 'sets cookie path correctly')
    }
  })

  t.test('will not set a new cookie when cookie age has not elapsed', (t: tape.Test) => {
    t.plan(1)

    const dateUnixTime = Math.floor(Date.now() / 1000)
    const expectedUserId = 'expectedUserId6234564'
    const validCookie = buildMitata({
      clientIP: ingestIgnoredIpValue,
      userId: expectedUserId,
      expiry: dateUnixTime + 60,
      type: '000'
    })

    getCookieHeaderStub.resetBehavior()
    getCookieHeaderStub.returns(`_mitata=${validCookie}; Max-Age=86400; Path=/`)

    const result = worker.callProcessIngest('ingest')

    t.deepEquals(result.setCookie, [], 'No cookies set')
  })
})

// eslint-disable-next-line max-lines-per-function
tape('NetaceaBase :: constructWebLog returns v2 weblog when v2 is set in config', (t: tape.Test) => {
  const scenarios: Array<{
    input: IngestArgs
    output: V2WebLog
    time: number
    comment: string
  }> = [
    {
      comment: 'Full Log',
      time: 1628156047970,
      input: {
        bytesSent: 100,
        ip: '1.1.1.1',
        method: 'GET',
        path: '/test?query=abc',
        protocol: 'HTTP 1.1/0',
        referer: 'your-referer',
        requestTime: 100,
        status: '200',
        userAgent: 'user-agent',
        integrationType: 'UNIT',
        integrationVersion: 'TEST',
        mitataCookie: mitataCookieValues.valid,
        sessionStatus: 'ip_block,captcha_serve'
      },
      output: {
        '@timestamp': '2021-08-05T09:34:07.970+00:00',
        'status': '200',
        'method': 'GET',
        'bytes_sent': 100,
        'referrer': 'your-referer',
        'request': 'GET /test?query=abc HTTP 1.1/0',
        'request_time': 100,
        'integration_type': 'UNIT',
        'integration_version': 'TEST',
        'client': '1.1.1.1',
        'user_agent': 'user-agent',
        'bc_type': 'ip_block,captcha_serve',
        'hour': 9,
        'minute': 34,
        'path': '/test',
        'protocol': 'HTTP 1.1/0',
        'query': '?query=abc',
        'user_id': 'c123456789012345'
      }
    },
    {
      comment: 'String numbers & Missing values',
      time: 1628156047970,
      input: {
        bytesSent: '400',
        ip: '1.1.1.1',
        method: 'GET',
        path: '/path?query=abc',
        protocol: 'HTTP 1.1/0',
        referer: '',
        requestTime: '200',
        status: '200',
        userAgent: 'user-agent',
        mitataCookie: mitataCookieValues.valid
      },
      output: {
        '@timestamp': '2021-08-05T09:34:07.970+00:00',
        'status': '200',
        'method': 'GET',
        'bytes_sent': 400,
        'referrer': undefined,
        'request': 'GET /path?query=abc HTTP 1.1/0',
        'request_time': 200,
        'client': '1.1.1.1',
        'user_agent': 'user-agent',
        'hour': 9,
        'minute': 34,
        'path': '/path',
        'protocol': 'HTTP 1.1/0',
        'query': '?query=abc',
        'user_id': 'c123456789012345',
        'bc_type': undefined,
        'integration_type': undefined,
        'integration_version': undefined
      }
    },
    {
      comment: 'Path with missing "/"',
      time: 1628156788138,
      input: {
        bytesSent: 100,
        ip: '1.1.1.1',
        method: 'GET',
        path: 'missingslash?query=abc',
        protocol: 'HTTP 1.1/0',
        referer: '',
        requestTime: 100,
        status: '200',
        userAgent: 'user-agent',
        mitataCookie: mitataCookieValues.valid
      },
      output: {
        '@timestamp': '2021-08-05T09:46:28.138+00:00',
        'status': '200',
        'method': 'GET',
        'bytes_sent': 100,
        'request': 'GET /missingslash?query=abc HTTP 1.1/0',
        'request_time': 100,
        'client': '1.1.1.1',
        'user_agent': 'user-agent',
        'hour': 9,
        'minute': 46,
        'path': '/missingslash',
        'protocol': 'HTTP 1.1/0',
        'query': '?query=abc',
        'user_id': 'c123456789012345',
        'referrer': undefined,
        'bc_type': undefined,
        'integration_type': undefined,
        'integration_version': undefined
      }
    },
    {
      comment: 'Non-numeric string values where ints are expected default to 0',
      time: 1628156788138,
      input: {
        bytesSent: 'notanumber',
        ip: '1.1.1.1',
        method: 'GET',
        path: '/path?query=abc',
        protocol: 'HTTP 1.1/0',
        referer: '',
        requestTime: 'notanumber',
        status: '200',
        userAgent: 'user-agent',
        mitataCookie: mitataCookieValues.valid
      },
      output: {
        '@timestamp': '2021-08-05T09:46:28.138+00:00',
        'status': '200',
        'method': 'GET',
        'bytes_sent': 0,
        'request': 'GET /path?query=abc HTTP 1.1/0',
        'request_time': 0,
        'client': '1.1.1.1',
        'user_agent': 'user-agent',
        'hour': 9,
        'minute': 46,
        'path': '/path',
        'protocol': 'HTTP 1.1/0',
        'query': '?query=abc',
        'user_id': 'c123456789012345',
        'referrer': undefined,
        'bc_type': undefined,
        'integration_type': undefined,
        'integration_version': undefined
      }
    },
    {
      comment: 'Undefined mitata cookie',
      time: 1628156788138,
      input: {
        bytesSent: 100,
        ip: '1.1.1.1',
        method: 'GET',
        path: '/path?query=abc',
        protocol: 'HTTP 1.1/0',
        referer: '',
        requestTime: 100,
        status: '200',
        userAgent: 'user-agent',
        mitataCookie: undefined
      },
      output: {
        '@timestamp': '2021-08-05T09:46:28.138+00:00',
        'status': '200',
        'method': 'GET',
        'bytes_sent': 100,
        'request': 'GET /path?query=abc HTTP 1.1/0',
        'request_time': 100,
        'client': '1.1.1.1',
        'user_agent': 'user-agent',
        'hour': 9,
        'minute': 46,
        'path': '/path',
        'protocol': 'HTTP 1.1/0',
        'query': '?query=abc',
        'user_id': undefined,
        'referrer': undefined,
        'bc_type': undefined,
        'integration_type': undefined,
        'integration_version': undefined
      }
    }
  ]
  let plan = 0
  scenarios.forEach(f => {
    plan += Object.keys(f.output).length
  })
  t.plan(plan)
  class Base extends NetaceaTestBase {
    public callProtectedConstructWebLog (args: IngestArgs): WebLog | V2WebLog {
      return this.constructWebLog(args)
    }
  }
  const n = new Base({
    apiKey: 'abc',
    logVersion: NetaceaLogVersion.V2
  })
  for (const scenario of scenarios) {
    t.comment(scenario.comment)
    const timerFake = sinon.useFakeTimers(scenario.time)
    const data = n.callProtectedConstructWebLog(scenario.input)
    for (const [key, value] of Object.entries(scenario.output)) {
      // @ts-ignore
      t.deepEquals(data[key], value, `Expects correct ${key} field`)
    }
    timerFake.restore()
  }
  t.end()
})
