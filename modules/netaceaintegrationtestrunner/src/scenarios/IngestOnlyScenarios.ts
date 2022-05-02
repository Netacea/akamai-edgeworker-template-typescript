import {
  ClientRequest,
  IntegrationTestScenario
} from '../TestRunner.types'
import {
  createMitataCookie, NetaceaIngestType, NetaceaMitigationType
} from '@netacea/netaceaintegrationbase'

// TODO: this is duplicated in a few files
export const defaultUserId = 'c123456789012345'
export const defaultClientIP = '255.255.255.255'
export const mitigationTestsSecret = 'mitigation-tests-secret'

const buildMitata = ({
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

const defaultOriginResponse = {
  status: 200,
  headers: {},
  body: undefined
}

const requests: {
  default: ClientRequest
  captchaPost: ClientRequest
  defaultWithValidCookie: ClientRequest
  defaultWithManyCookies: ClientRequest
  defaultWithBlockedCookie: ClientRequest
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
  defaultWithManyCookies: {
    protocol: 'HTTP/1.0',
    url: '/',
    userAgent: 'userAgent',
    method: 'GET',
    cookieHeader: `_other-cookie=somevalue;_mitata=${mitata.valid};_anothercookie=somevalue`,
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

function withDefaults (scenarios: IntegrationTestScenario[]): IntegrationTestScenario[] {
  return scenarios.map(scenario => ({
    ...scenario,
    workerArgs: {
      mitigationType: NetaceaMitigationType.INGEST,
      ingestType: NetaceaIngestType.HTTP
    }
  }))
}

// eslint-disable-next-line max-lines-per-function
export const ingestOnlyScenarios = (): IntegrationTestScenario[] => withDefaults([
  {
    comment: '000 mitata',
    expectedSessionStatus: '',
    clientRequest: requests.default,
    originResponse: defaultOriginResponse,
    expectedClientResponse: {
      status: defaultOriginResponse.status,
      body: defaultOriginResponse.body,
      headers: {
        'set-cookie': ['_mitata=testing; Max-Age=86400; Path=/']
      }
    }
  },
  {
    comment: '000 mitata - allows cookies set by origin',
    expectedSessionStatus: '',
    clientRequest: requests.default,
    originResponse: {
      status: 200,
      headers: {
        'set-cookie': [
          '_origin-session=session_token',
          '_origin-tracker=tracking_token'
        ]
      },
      body: '<DOCTYPE html>...'
    },
    expectedClientResponse: {
      status: 200,
      headers: {
        'set-cookie': [
          '_origin-session=session_token',
          '_origin-tracker=tracking_token',
          '_mitata=testing; Max-Age=86400; Path=/'
        ]
      },
      body: '<DOCTYPE html>...'
    }
  },
  {
    comment: 'Valid Mitata cookie',
    expectedSessionStatus: '',
    clientRequest: requests.defaultWithValidCookie,
    originResponse: defaultOriginResponse,
    expectedClientResponse: {
      status: defaultOriginResponse.status,
      body: defaultOriginResponse.body,
      headers: {
        'set-cookie': [
          '_mitata=testing; Max-Age=86400; Path=/'
        ]
      }
    }
  },
  {
    comment: 'Valid Mitata cookie - can filter from other client request / origin response cookies',
    expectedSessionStatus: '',
    clientRequest: requests.defaultWithManyCookies,
    originResponse: {
      status: 200,
      headers: {
        'set-cookie': [
          '_origin-session=session_token',
          '_origin-tracker=tracking_token'
        ]
      },
      body: '<DOCTYPE html>...'
    },
    expectedClientResponse: {
      status: 200,
      body: '<DOCTYPE html>...',
      headers: {
        'set-cookie': [
          '_mitata=testing; Max-Age=86400; Path=/',
          '_origin-session=session_token',
          '_origin-tracker=tracking_token'
        ]
      }
    }
  },
  {
    comment: 'Ingest Service call error',
    expectedSessionStatus: '',
    ingestResponse: new Error('Testing -> failed Ingest Svc call'),
    clientRequest: requests.default,
    originResponse: defaultOriginResponse,
    expectedClientResponse: {
      status: defaultOriginResponse.status,
      body: defaultOriginResponse.body,
      headers: {
        'set-cookie': [
          '_mitata=testing; Max-Age=86400; Path=/'
        ]
      }
    }
  }
])
