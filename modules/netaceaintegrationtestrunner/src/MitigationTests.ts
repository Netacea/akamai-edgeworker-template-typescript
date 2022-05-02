/**
 * LEGACY TEST FRAMEWORK
 * Refer to README.md for a guide on implementing new tests.
*/

import NetaceaBase, {
  MitigateResponse,
  NetaceaMitigationType,
  createMitataCookie
} from '@netacea/netaceaintegrationbase'
import * as sinon from 'sinon'
import * as tape from 'tape'
import { checkMitataCookieSet } from './Helpers'

export interface TransformRequestArgs {
  protocol: 'HTTP/1.0' | 'HTTP/1.1'
  url: string
  userAgent: string
  method: 'GET' | 'POST' | 'PUT' | 'OPTIONS'
  cookieHeader?: string
  ipAddress: string
  body?: string
  headers?: {[key: string]: string}
}

export interface StubXhrCallArgs {
  match?: string
  mitigate?: string
  captcha?: string
  mitataExpiry?: string
  mitata?: string
  mitataCaptcha?: string
  mitataCaptchaExpiry?: string
  status: number
  body?: string
  eventId?: string
}

export interface TestResponse {
  status: number | undefined
  body?: string
  headers?: {[key: string]: string} | undefined
}

export interface IngestResponse {
  status: number
}

export const apiKey = 'apiKey'
export const secretKey = 'secret'

// TODO: this is duplicated in netaceaintegrationbase, can we move it to a common place?
export const defaultUserId = 'c123456789012345'
export const defaultClientIP = '255.255.255.255'
export const mitigationTestsSecret = 'mitigation-tests-secret'
export const defaultSecret = 'secret'
export const buildMitata = ({
  clientIP = defaultClientIP,
  userId = defaultUserId,
  expiry = (Date.now() + 60000) / 1000,
  type = '000',
  secret = mitigationTestsSecret
}: {
  clientIP?: string
  userId?: string
  expiry?: number
  type?: string
  secret?: string
}): string => {
  return createMitataCookie(clientIP, userId, expiry, secret, type)
}

const ipAddress = '255.255.255.255'

const mitata = {
  valid: buildMitata({
    expiry: 1601993684,
    userId: defaultUserId,
    type: '000',
    secret: mitigationTestsSecret
  }),
  ipBlocked: buildMitata({
    expiry: 1601993604,
    userId: defaultUserId,
    type: '210',
    secret: mitigationTestsSecret
  })
}

export const requests: {
  default: TransformRequestArgs
  captchaPost: TransformRequestArgs
  defaultWithValidCookie: TransformRequestArgs
  defaultWithBlockedCookie: TransformRequestArgs
} = {
  default: {
    protocol: 'HTTP/1.0',
    url: '/',
    userAgent: 'userAgent',
    method: 'GET',
    ipAddress
  },
  defaultWithValidCookie: {
    protocol: 'HTTP/1.0',
    url: '/',
    userAgent: 'userAgent',
    method: 'GET',
    cookieHeader: `_mitata=${mitata.valid}`,
    ipAddress
  },
  captchaPost: {
    protocol: 'HTTP/1.0',
    url: '/AtaVerifyCaptcha',
    userAgent: 'userAgent',
    method: 'POST',
    ipAddress
  },
  defaultWithBlockedCookie: {
    protocol: 'HTTP/1.0',
    url: '/',
    userAgent: 'userAgent',
    method: 'GET',
    cookieHeader: `_mitata=${mitata.ipBlocked}`,
    ipAddress
  }
}

// eslint-disable-next-line max-lines-per-function
const mitigationScenarios = (statusCodes: ExpectedStatusCodes): Array<{
  workerArgs?: { [key: string]: any }
  xhrArgs?: StubXhrCallArgs
  request: TransformRequestArgs
  expected: MitigateResponse<TestResponse>
  comment: string
  xhrCallCount: number
}> => [
  {
    comment: '000 mitata',
    xhrArgs: {
      match: '0',
      mitigate: '0',
      captcha: '0',
      mitataExpiry: '86400',
      mitata: 'testing',
      status: 200
    },
    request: requests.default,
    expected: {
      response: undefined,
      setCookie: [
        '_mitata=testing; Max-Age=86400; Path=/'
      ],
      sessionStatus: ''
    },
    xhrCallCount: 1
  },
  {
    comment: '110 mitata',
    xhrArgs: {
      match: '1',
      mitigate: '1',
      captcha: '0',
      mitataExpiry: '86400',
      mitata: 'testing',
      status: 200
    },
    request: requests.default,
    expected: {
      response: {
        status: statusCodes.blocked,
        body: 'Forbidden'
      },
      setCookie: [
        '_mitata=testing; Max-Age=86400; Path=/'
      ],
      sessionStatus: 'ua_blocked'
    },
    xhrCallCount: 1
  },
  {
    comment: '210 mitata',
    xhrArgs: {
      match: '2',
      mitigate: '1',
      captcha: '0',
      mitataExpiry: '86400',
      mitata: 'testing',
      status: 200
    },
    request: requests.default,
    expected: {
      response: {
        status: statusCodes.blocked,
        body: 'Forbidden'
      },
      setCookie: [
        '_mitata=testing; Max-Age=86400; Path=/'
      ],
      sessionStatus: 'ip_blocked'
    },
    xhrCallCount: 1
  },
  {
    comment: '211 mitata',
    xhrArgs: {
      match: '2',
      mitigate: '1',
      captcha: '1',
      mitataExpiry: '86400',
      mitata: 'testing',
      status: 200,
      body: 'fakecaptchapage'
    },
    request: requests.default,
    expected: {
      response: {
        status: statusCodes.captcha,
        body: 'fakecaptchapage'
      },
      setCookie: [
        '_mitata=testing; Max-Age=86400; Path=/'
      ],
      sessionStatus: 'ip_blocked,captcha_serve'
    },
    xhrCallCount: 1
  },
  {
    comment: '211 mitata - with captcha keys',
    workerArgs: {
      captchaSiteKey: 'some-captcha-site-key',
      captchaSecretKey: 'some-captcha-secret-key'
    },
    xhrArgs: {
      match: '2',
      mitigate: '1',
      captcha: '1',
      mitataExpiry: '86400',
      mitata: 'testing',
      status: 200,
      body: 'fakecaptchapage'
    },
    request: requests.default,
    expected: {
      response: {
        status: statusCodes.captcha,
        body: 'fakecaptchapage'
      },
      setCookie: [
        '_mitata=testing; Max-Age=86400; Path=/'
      ],
      sessionStatus: 'ip_blocked,captcha_serve'
    },
    xhrCallCount: 1
  },
  {
    comment: '212 mitata',
    xhrArgs: {
      match: '2',
      mitigate: '1',
      captcha: '2',
      mitataExpiry: '86400',
      mitata: 'testing',
      status: 200
    },
    request: requests.default,
    expected: {
      setCookie: [
        '_mitata=testing; Max-Age=86400; Path=/'
      ],
      sessionStatus: 'ip_blocked,captcha_cookiepass'
    },
    xhrCallCount: 1
  },
  {
    comment: '212 mitata captcha POST',
    xhrArgs: {
      match: '2',
      mitigate: '1',
      captcha: '2',
      mitataExpiry: '86400',
      mitata: 'testing',
      status: 200
    },
    request: requests.captchaPost,
    expected: {
      response: {
        status: statusCodes.blocked,
        body: 'Forbidden'
      },
      setCookie: [
        '_mitata=testing; Max-Age=86400; Path=/'
      ],
      sessionStatus: 'ip_blocked,captcha_pass'
    },
    xhrCallCount: 1
  },
  {
    comment: '999 mitata',
    xhrArgs: {
      match: '9',
      mitigate: '9',
      captcha: '9',
      mitataExpiry: '86400',
      mitata: 'testing',
      status: 200
    },
    request: requests.captchaPost,
    expected: {
      response: undefined,
      setCookie: [
        '_mitata=testing; Max-Age=86400; Path=/'
      ],
      sessionStatus: 'unknown_unknown,unknown'
    },
    xhrCallCount: 1
  },
  {
    comment: 'Valid Mitata cookie',
    expected: {
      response: undefined,
      setCookie: [],
      sessionStatus: ''
    },
    request: requests.defaultWithValidCookie,
    xhrCallCount: 0
  },
  {
    comment: 'Blocked Mitata Cookie',
    request: requests.defaultWithBlockedCookie,
    xhrArgs: {
      match: '2',
      mitigate: '1',
      captcha: '0',
      mitata: 'testing',
      mitataExpiry: '86400',
      status: 200
    },
    expected: {
      response: {
        status: statusCodes.blocked,
        body: 'Forbidden'
      },
      sessionStatus: 'ip_blocked',
      setCookie: [
        '_mitata=testing; Max-Age=86400; Path=/'
      ]
    },
    xhrCallCount: 1
  },
  {
    comment: 'EventID is passed',
    request: requests.defaultWithBlockedCookie,
    xhrArgs: {
      match: '2',
      mitigate: '1',
      captcha: '0',
      mitata: 'testing',
      mitataExpiry: '86400',
      eventId: 'eventid-from-test',
      status: 200
    },
    expected: {
      response: {
        status: statusCodes.blocked,
        body: 'Forbidden'
      },
      sessionStatus: 'ip_blocked',
      setCookie: [
        '_mitata=testing; Max-Age=86400; Path=/'
      ]
    },
    xhrCallCount: 1
  }
]
interface ExpectedStatusCodes {
  blocked: number
  captcha: number
}
export interface RunTestArgs<T> {
  tape: tape.Test
  createWorker: ((args?: any, xhrArgs?: any) => NetaceaBase)
  transformRequest: (args: TransformRequestArgs) => any
  transformResponse: (response?: T) => any
  stubXhrCalls: (args: StubXhrCallArgs) => sinon.SinonSandbox | undefined
  statusCodes?: ExpectedStatusCodes
}

function assertCaptchaHeadersArePresent (t: any, workerArgs: any, makeRequestSpy: any): void {
  for (const call of makeRequestSpy.getCalls()) {
    const [{
      headers: {
        'X-Netacea-Captcha-Site-Key': captchaSiteKey,
        'X-Netacea-Captcha-Secret-Key': captchaSecretKey
      }
    }] = call.args

    t.deepEquals(
      [captchaSiteKey, captchaSecretKey],
      [workerArgs.captchaSiteKey, workerArgs.captchaSecretKey],
      'makeRequest is called with correct captcha keys'
    )
  }
}

export function assertCorrectMitataIsSet (
  t: tape.Test,
  setMitata: string | undefined,
  request: TransformRequestArgs,
  xhrArgs: StubXhrCallArgs | undefined
): void {
  // TODO: shouldn't need akamai specific if statements
  if (process.env.CDN !== 'AKAMAI') {
    t.true(setMitata !== undefined, 'A mitata cookie is set')
  }
  if (setMitata !== undefined && xhrArgs !== undefined) {
    const cookieChecks = checkMitataCookieSet(setMitata, '255.255.255.255', mitigationTestsSecret)
    t.true(cookieChecks.isPrimaryHashValid, 'mitata cookie is valid')
    t.true(cookieChecks.isExpired === cookieChecks.shouldExpire, 'mitata cookie expires when expected')
    t.true(cookieChecks.isSameIP, 'mitata cookie IP is the same')
    t.equal(String(cookieChecks.match), xhrArgs?.match, 'cookie match')
    t.equal(String(cookieChecks.mitigate), xhrArgs?.mitigate, 'cookie mitigate')
    t.equal(String(cookieChecks.captcha), xhrArgs?.captcha, 'cookie captcha')

    if (request.cookieHeader !== undefined) {
      t.equal(cookieChecks.mitata?.userId, defaultUserId, 'User ID is retained')
    } else {
      t.true(cookieChecks.mitata?.userId.startsWith('c'), 'User ID starts with c')
    }
  }
}

export function runMitigationTests<T> (
  {
    tape, createWorker, transformRequest, transformResponse, stubXhrCalls,
    statusCodes = {
      blocked: 403,
      captcha: 403
    }
  }: RunTestArgs<T>
): void {
  for (const { workerArgs, xhrArgs, request, expected, comment, xhrCallCount } of mitigationScenarios(statusCodes)) {
    // This is important so we don't need to rebuild cookies
    sinon.useFakeTimers(1601993624000)
    tape.test(comment, async (t: tape.Test) => {
      const worker = createWorker({
        ...workerArgs,
        mitigationType: NetaceaMitigationType.MITIGATE,
        secretKey: mitigationTestsSecret
      }, xhrArgs)
      // @ts-ignore
      const makeRequestSpy = sinon.spy(worker, 'makeRequest')
      let stub: sinon.SinonSandbox | undefined
      if (xhrArgs !== undefined) {
        stub = stubXhrCalls(xhrArgs)
      }
      const res = await worker.runMitigation(
        transformRequest(request)
      ) as MitigateResponse<T>
      const response = await transformResponse(res.response)
      t.equals(response?.status?.toString(), expected.response?.status?.toString(), 'Expects correct status')
      t.equals(response?.body?.toString(), expected.response?.body, 'Expects correct body')
      t.equals(res.sessionStatus, expected.sessionStatus, 'Expects correct session status')
      t.equals(makeRequestSpy.callCount, xhrCallCount, `Expects makeRequest to be called ${xhrCallCount} times`)

      if (expected.setCookie?.find(cookie => cookie.startsWith('_mitata=')) !== undefined) {
        const setMitata = res.setCookie?.find(cookie => cookie.startsWith('_mitata='))
        assertCorrectMitataIsSet(t, setMitata, request, xhrArgs)
      }

      if (workerArgs?.captchaSiteKey !== undefined || workerArgs?.captchaSecretKey !== undefined) {
        assertCaptchaHeadersArePresent(t, workerArgs, makeRequestSpy)
      }

      stub?.restore()
      makeRequestSpy.restore()
      t.end()
    })
  }
}
