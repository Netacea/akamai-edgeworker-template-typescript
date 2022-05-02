/**
 * LEGACY TEST FRAMEWORK
 * Refer to README.md for a guide on implementing new tests.
*/

import { buildMitata } from '../src'
import {
  ingestIgnoredIpValue,
  MitigateResponse,
  NetaceaMitigationType
} from '@netacea/netaceaintegrationbase'
import * as sinon from 'sinon'
import * as tape from 'tape'
import { RunTestArgs } from './MitigationTests'
import { checkMitataCookieSet } from './Helpers'

export const ingestOnlyTestsSecret = 'ingest-only-tests-secret'
const defaultUserId = 'm123456789abcdef'
const mitata = {
  valid: buildMitata({
    clientIP: ingestIgnoredIpValue,
    expiry: 1601993684,
    userId: defaultUserId,
    type: '000',
    secret: ingestOnlyTestsSecret
  }),
  ipBlocked: buildMitata({
    clientIP: ingestIgnoredIpValue,
    expiry: 1601993604,
    userId: defaultUserId,
    type: '210',
    secret: ingestOnlyTestsSecret
  })
}

interface TransformRequestArgs {
  protocol: 'HTTP/1.0' | 'HTTP/1.1'
  url: string
  userAgent: string
  method: 'GET' | 'POST' | 'PUT' | 'OPTIONS'
  cookieHeader?: string
  ipAddress: string
  body?: string
  headers?: {[key: string]: string}
}

interface StubXhrCallArgs {
  match?: string
  mitigate?: string
  captcha?: string
  mitataExpiry?: string
  mitata?: string
  mitataCaptcha?: string
  mitataCaptchaExpiry?: string
  status: number
  body?: string
}

interface TestResponse {
  status: number
  body?: string
  headers?: {[key: string]: string} | undefined
}

const ipAddress = '255.255.255.255'

const requests: {
  default: TransformRequestArgs
  defaultWithValidCookie: TransformRequestArgs
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
  }
}

// eslint-disable-next-line max-lines-per-function
const scenarios = (statusCodes: ExpectedStatusCodes): Array<{
  workerArgs?: { [key: string]: any }
  request: TransformRequestArgs
  expected: MitigateResponse<TestResponse>
  comment: string
  expectNewMitataCookie: boolean
}> => [
  {
    comment: 'Ingest Only request - no cookie',
    request: requests.default,
    expected: {
      sessionStatus: ''
    },
    expectNewMitataCookie: true
  },
  {
    comment: 'Ingest Only request - existing cookie',
    request: requests.defaultWithValidCookie,
    expected: {
      sessionStatus: ''
    },
    expectNewMitataCookie: false
  }
]

interface ExpectedStatusCodes {
  blocked: number
  captcha: number
}

function assertCorrectMitataIsSet (
  t: tape.Test,
  setMitata: string | undefined,
  request: TransformRequestArgs
): void {
  // TODO: shouldn't need akamai specific if statements
  if (process.env.CDN !== 'AKAMAI') {
    t.true(setMitata !== undefined, 'A mitata cookie is set')
  }
  if (setMitata !== undefined) {
    const cookieChecks = checkMitataCookieSet(setMitata, ingestIgnoredIpValue, ingestOnlyTestsSecret)
    t.true(cookieChecks.isPrimaryHashValid, 'mitata cookie is valid')
    t.false(cookieChecks.isExpired, 'mitata cookie has not expired')
    t.true(cookieChecks.isSameIP, 'mitata cookie IP is the same')
    t.equal(cookieChecks.match, 0, 'cookie match')
    t.equal(cookieChecks.mitigate, 0, 'cookie mitigate')
    t.equal(cookieChecks.captcha, 0, 'cookie captcha')

    if (request.cookieHeader !== undefined) {
      t.equal(cookieChecks.mitata?.userId, defaultUserId, 'User ID is retained')
    } else {
      t.true(cookieChecks.mitata?.userId.startsWith('c'), 'User ID starts with c')
    }
  }
}

export function runIngestOnlyTests<T> (
  {
    tape, createWorker, transformRequest, transformResponse,
    statusCodes = {
      blocked: 403,
      captcha: 403
    }
  }: RunTestArgs<T>
): void {
  for (const { workerArgs, request, expected, expectNewMitataCookie, comment } of scenarios(statusCodes)) {
    tape.test(comment, async (t: tape.Test) => {
      const worker = createWorker({
        ...workerArgs,
        mitigationType: NetaceaMitigationType.INGEST,
        secretKey: ingestOnlyTestsSecret
      })

      const makeRequestStub = sinon.stub(worker as any, 'makeRequest')
        .throws(new Error('Make request should not be called!'))

      const res = await worker.runMitigation(
        transformRequest(request)
      ) as MitigateResponse<T>

      t.equals(res.sessionStatus, expected.sessionStatus, 'Expects correct session status')
      t.equals(makeRequestStub.callCount, 0, 'makeRequest should not be called')

      if (expectNewMitataCookie) {
        const setMitata = res.setCookie?.find(cookie => cookie.startsWith('_mitata='))
        assertCorrectMitataIsSet(t, setMitata, request)
      }

      makeRequestStub.restore()
      t.end()
    })
  }
}
