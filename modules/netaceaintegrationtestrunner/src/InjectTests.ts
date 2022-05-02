/**
 * LEGACY TEST FRAMEWORK
 * Refer to README.md for a guide on implementing new tests.
*/

import {
  InjectResponse,
  NetaceaMitigationType
} from '@netacea/netaceaintegrationbase'
import * as sinon from 'sinon'
import * as tape from 'tape'
import {
  StubXhrCallArgs,
  TransformRequestArgs,
  RunTestArgs,
  requests,
  assertCorrectMitataIsSet
} from './MitigationTests'

// eslint-disable-next-line max-lines-per-function
const injectScenarios = (): Array<{
  xhrArgs?: StubXhrCallArgs
  request: TransformRequestArgs
  expected: InjectResponse
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
      injectHeaders: {
        'x-netacea-match': '0',
        'x-netacea-mitigate': '0',
        'x-netacea-captcha': '0'
      },
      sessionStatus: '',
      response: undefined,
      setCookie: [
        '_mitata=testing; Max-Age=86400; Path=/'
      ]
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
      injectHeaders: {
        'x-netacea-match': '1',
        'x-netacea-mitigate': '1',
        'x-netacea-captcha': '0'
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
      injectHeaders: {
        'x-netacea-match': '2',
        'x-netacea-mitigate': '1',
        'x-netacea-captcha': '0'
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
      injectHeaders: {
        'x-netacea-match': '2',
        'x-netacea-mitigate': '1',
        'x-netacea-captcha': '1'
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
      injectHeaders: {
        'x-netacea-match': '2',
        'x-netacea-mitigate': '1',
        'x-netacea-captcha': '4'
      },
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
      injectHeaders: {
        'x-netacea-match': '2',
        'x-netacea-mitigate': '1',
        'x-netacea-captcha': '2'
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
      injectHeaders: {
        'x-netacea-match': '9',
        'x-netacea-mitigate': '9',
        'x-netacea-captcha': '9'
      },
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
      injectHeaders: {
        'x-netacea-match': '0',
        'x-netacea-mitigate': '0',
        'x-netacea-captcha': '0'
      },
      setCookie: [],
      sessionStatus: ''
    },
    request: requests.defaultWithValidCookie,
    xhrCallCount: 0
  },
  {
    comment: 'Event ID Injected if provided',
    request: requests.defaultWithBlockedCookie,
    xhrArgs: {
      match: '2',
      mitigate: '1',
      captcha: '0',
      mitata: 'testing',
      mitataExpiry: '86400',
      status: 200,
      eventId: 'eventid'
    },
    expected: {
      injectHeaders: {
        'x-netacea-match': '2',
        'x-netacea-mitigate': '1',
        'x-netacea-captcha': '0',
        'x-netacea-event-id': 'eventid'
      },
      sessionStatus: 'ip_blocked',
      setCookie: [
        '_mitata=testing; Max-Age=86400; Path=/'
      ]
    },
    xhrCallCount: 1
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
      injectHeaders: {
        'x-netacea-match': '2',
        'x-netacea-mitigate': '1',
        'x-netacea-captcha': '0'
      },
      sessionStatus: 'ip_blocked',
      setCookie: [
        '_mitata=testing; Max-Age=86400; Path=/'
      ]
    },
    xhrCallCount: 1
  }
]

// eslint-disable-next-line max-lines-per-function
export function runInjectTests<T> ({
  tape, createWorker, transformRequest, transformResponse, stubXhrCalls
}: RunTestArgs<T>): void {
  for (const { xhrArgs, request, expected, comment, xhrCallCount } of injectScenarios()) {
    // This is important so we don't need to rebuild cookies
    sinon.useFakeTimers(1601993624000)
    const secretKey = 'mitigation-tests-secret'
    tape.test(comment, async (t: tape.Test) => {
      const worker = createWorker({
        mitigationType: NetaceaMitigationType.INJECT,
        secretKey
      }, xhrArgs)
      // @ts-ignore
      const makeRequestSpy = sinon.spy(worker, 'makeRequest')
      let stub: sinon.SinonSandbox | undefined
      if (xhrArgs !== undefined) {
        stub = stubXhrCalls(xhrArgs)
      }
      const res = await worker.runMitigation(
        transformRequest(request)
      ) as InjectResponse<T>
      await transformResponse(res.response)

      if (expected.setCookie?.find(cookie => cookie.startsWith('_mitata=')) !== undefined) {
        const setMitata = res.setCookie?.find(cookie => cookie.startsWith('_mitata='))
        assertCorrectMitataIsSet(t, setMitata, request, xhrArgs)
      }

      t.equals(res.sessionStatus, expected.sessionStatus, 'Expects correct session status')
      t.equals(makeRequestSpy.callCount, xhrCallCount, `Expects makeRequest to be called ${xhrCallCount} times`)
      t.equals(
        res.injectHeaders?.['x-netacea-match'],
        expected.injectHeaders?.['x-netacea-match'],
        'Expects correct match header'
      )
      t.equals(
        res.injectHeaders?.['x-netacea-mitigate'],
        expected.injectHeaders?.['x-netacea-mitigate'],
        'Expects correct mitigate header'
      )
      t.equals(
        res.injectHeaders?.['x-netacea-captcha'],
        expected.injectHeaders?.['x-netacea-captcha'],
        'Expects correct captcha header'
      )
      t.equals(
        res.injectHeaders?.['x-netacea-event-id'],
        expected.injectHeaders?.['x-netacea-event-id'],
        'Expects correct event-id header'
      )
      stub?.restore()
      makeRequestSpy.restore()
    })
  }
}
