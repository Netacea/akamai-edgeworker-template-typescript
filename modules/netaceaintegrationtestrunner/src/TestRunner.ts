import {
  ingestIgnoredIpValue,
  NetaceaIngestType,
  NetaceaMitigationType
} from '@netacea/netaceaintegrationbase'
import * as sinon from 'sinon'
import * as tape from 'tape'
import {
  checkMitataCookieSet
} from './Helpers'
import {
  defaultUserId,
  mitigationTestsSecret
} from './scenarios/MitigationScenarios'
import {
  ExpectedStatusCodes,
  ClientRequest,
  ClientResponse,
  HttpRequest,
  HttpResponse,
  MitigationServiceResponse,
  MitigationRequest,
  IngestRequest,
  MitigationResponse,
  IntegrationTestScenario
} from './TestRunner.types'

export interface RunWorkerArgs {
  workerArgs: { [key: string]: any } | undefined
  request: ClientRequest
  originResponse: HttpResponse | undefined
  mitigationServiceResponse: MitigationResponse | Error | undefined
  ingestResponse?: Error
}

export interface RunWorkerResult {
  clientResponse: HttpResponse
  mitSvcRequestsMade: MitigationRequest[]
  ingestSvcRequestsMade: IngestRequest[]
}

interface RunTestArgs<T> {
  tape: tape.Test
  runWorker: (args: RunWorkerArgs) => Promise<RunWorkerResult>
  statusCodes?: ExpectedStatusCodes
  testScenarios: IntegrationTestScenario[]
}

function assertCorrectMitataIsSet (
  t: tape.Test,
  integrationType: NetaceaMitigationType,
  clientRequest: ClientRequest,
  actualClientResponse: ClientResponse,
  expectedClientResponse: ClientResponse,
  mitigationServiceResponse: MitigationServiceResponse | Error | undefined
): void {
  const actualSetMitata = getSetCookie(actualClientResponse, '_mitata')
  const expectedSetMitata = getSetCookie(expectedClientResponse, '_mitata')

  if (expectedSetMitata === undefined) {
    t.equal(actualSetMitata, undefined, 'Mitata should not be set')
    return
  }

  if (mitigationServiceResponse instanceof Error) {
    t.equal(actualSetMitata, undefined, 'Mitata is not set on fail-open')
    return
  }

  const cookieChecks = integrationType === NetaceaMitigationType.INGEST
    ? checkMitataCookieSet(actualSetMitata, ingestIgnoredIpValue, mitigationTestsSecret)
    : checkMitataCookieSet(actualSetMitata, '255.255.255.255', mitigationTestsSecret)

  t.true(cookieChecks.isPrimaryHashValid, 'mitata cookie is valid')
  t.true(cookieChecks.isExpired === cookieChecks.shouldExpire, 'mitata cookie expires when expected')
  t.true(cookieChecks.isSameIP, 'mitata cookie IP is the same')

  if (clientRequest.cookieHeader !== undefined) {
    t.equal(cookieChecks.mitata?.userId, defaultUserId, 'User ID is retained')
  } else {
    t.true(cookieChecks.mitata?.userId.startsWith('c'), 'User ID starts with c')
  }

  if (integrationType === NetaceaMitigationType.INGEST) {
    t.equal(String(cookieChecks.match), '0', 'cookie match')
    t.equal(String(cookieChecks.mitigate), '0', 'cookie mitigate')
    t.equal(String(cookieChecks.captcha), '0', 'cookie captcha')
  } else {
    t.equal(String(cookieChecks.match), mitigationServiceResponse?.match, 'cookie match')
    t.equal(String(cookieChecks.mitigate), mitigationServiceResponse?.mitigate, 'cookie mitigate')
    t.equal(String(cookieChecks.captcha), mitigationServiceResponse?.captcha, 'cookie captcha')
  }
}

function createMitSvcHttpResponse (
  mitSvcResponse: MitigationServiceResponse | Error | undefined
): HttpResponse | Error | undefined {
  if (mitSvcResponse === undefined || mitSvcResponse instanceof Error) {
    return mitSvcResponse
  }
  const headers: { [key: string]: string[] } = {}
  if (mitSvcResponse.match !== undefined) {
    headers['x-netacea-match'] = [mitSvcResponse.match]
  }
  if (mitSvcResponse.mitigate !== undefined) {
    headers['x-netacea-mitigate'] = [mitSvcResponse.mitigate]
  }
  if (mitSvcResponse.captcha !== undefined) {
    headers['x-netacea-captcha'] = [mitSvcResponse.captcha]
  }
  if (mitSvcResponse.mitataExpiry !== undefined) {
    headers['x-netacea-mitata-expiry'] = [mitSvcResponse.mitataExpiry]
  }
  if (mitSvcResponse.eventId !== undefined) {
    headers['x-netacea-event-id'] = [mitSvcResponse.eventId]
  }
  return {
    status: mitSvcResponse.status,
    body: mitSvcResponse.body,
    headers
  }
}

function assertCorrectMitigationServiceRequestsMade ({
  t,
  mitigationServiceResponse,
  mitSvcRequestsMade
}: {
  t: tape.Test
  mitigationServiceResponse: Error | MitigationServiceResponse | undefined
  mitSvcRequestsMade: MitigationRequest[]
}): void {
  const expectedMitSvcCallCount = mitigationServiceResponse === undefined ? 0 : 1
  t.equal(mitSvcRequestsMade.length, expectedMitSvcCallCount, 'The Mitigation Service is called')
}

function assertCorrectIngestServiceRequestsMade ({
  t,
  expectedSessionStatus,
  ingestSvcRequestsMade
}: {
  t: tape.Test
  expectedSessionStatus: string
  ingestSvcRequestsMade: HttpRequest[]
}): void {
  t.equal(ingestSvcRequestsMade.length, 1, 'The Ingest Service is called')
  for (const ingestReq of ingestSvcRequestsMade) {
    const body = JSON.parse(ingestReq.body)
    t.equal(body.NetaceaMitigationApplied, expectedSessionStatus, 'Correct session status')
  }
}

function assertCorrectResponseHeaders (
  t: tape.Test,
  integrationType: NetaceaMitigationType,
  clientRequest: ClientRequest,
  actualClientResponse: ClientResponse,
  expectedClientResponse: ClientResponse,
  mitigationServiceResponse: MitigationServiceResponse | Error | undefined
): void {
  t.equal(
    Object.entries(actualClientResponse.headers).length,
    Object.entries(expectedClientResponse.headers).length,
    'Correct number of headers'
  )
  for (const [headerName, expectedHeaderValues] of Object.entries(expectedClientResponse.headers)) {
    if (headerName.toLowerCase() === 'set-cookie') {
      t.deepEqual(
        actualClientResponse.headers[headerName].filter(c => !c.startsWith('_mitata=')),
        expectedHeaderValues.filter(c => !c.startsWith('_mitata=')),
        `correct ${headerName} header(s)`
      )
      // advanced logic for checking mitata
      assertCorrectMitataIsSet(
        t,
        integrationType,
        clientRequest,
        actualClientResponse,
        expectedClientResponse,
        mitigationServiceResponse
      )
    } else {
      t.deepEqual(actualClientResponse.headers[headerName], expectedHeaderValues, `correct ${headerName} header(s)`)
    }
  }
}

// eslint-disable-next-line max-lines-per-function
export function runIntegrationTests<T> (
  {
    tape,
    runWorker,
    testScenarios
  }: RunTestArgs<T>
): void {
  for (const {
    comment,
    expectedSessionStatus,
    workerArgs,
    mitigationServiceResponse,
    clientRequest,
    originResponse,
    expectedClientResponse
  } of testScenarios) {
    // This is important so we don't need to rebuild cookies

    sinon.useFakeTimers(1601993624000)
    // eslint-disable-next-line max-lines-per-function
    tape.test(comment, async (t: tape.Test) => {
      try {
        const {
          clientResponse,
          mitSvcRequestsMade,
          ingestSvcRequestsMade
        } = await runWorker({
          workerArgs: {
            mitigationType: NetaceaMitigationType.MITIGATE,
            ingestType: NetaceaIngestType.HTTP,
            ...workerArgs,
            secretKey: mitigationTestsSecret
          },
          request: clientRequest,
          originResponse,
          mitigationServiceResponse: createMitSvcHttpResponse(mitigationServiceResponse)
        })

        t.equals(clientResponse?.status?.toString(), expectedClientResponse?.status?.toString(), 'Correct status')
        t.equals(clientResponse?.body?.toString(), expectedClientResponse?.body, 'Correct body')

        assertCorrectResponseHeaders(
          t,
          workerArgs?.mitigationType ?? NetaceaMitigationType.MITIGATE,
          clientRequest,
          clientResponse,
          expectedClientResponse,
          mitigationServiceResponse
        )

        assertCorrectMitigationServiceRequestsMade({
          t,
          mitigationServiceResponse,
          mitSvcRequestsMade
        })

        assertCorrectIngestServiceRequestsMade({
          t,
          expectedSessionStatus,
          ingestSvcRequestsMade
        })
      } catch (err) {
        t.error(err)
      }

      t.end()
    })
  }
}

function getSetCookie (clientResponse: ClientResponse, cookieName: string): string | undefined {
  if (clientResponse.headers === undefined) return undefined
  const setCookieHeaders = Object.entries(clientResponse.headers)
    .filter(([name]) => name.toLowerCase() === 'set-cookie')

  const allMatchingCookies: string[] = []
  for (const [/* name */, values] of setCookieHeaders) {
    const filtered = values.filter(cookies => {
      return cookies.startsWith(`${cookieName}=`)
    })
    allMatchingCookies.push(...filtered)
  }

  if (allMatchingCookies.length === 0) {
    return undefined
  }
  if (allMatchingCookies.length > 1) {
    throw new Error(`More than one cookies set with name '${cookieName}'`)
  }

  return allMatchingCookies[0]
}
