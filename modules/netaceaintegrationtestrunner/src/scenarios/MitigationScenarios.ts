import {
  ClientRequest,
  ExpectedStatusCodes,
  IntegrationTestScenario
} from '../TestRunner.types'
import {
  createMitataCookie
} from '@netacea/netaceaintegrationbase'

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

// eslint-disable-next-line max-lines-per-function
export const mitigationScenarios = (statusCodes: ExpectedStatusCodes): IntegrationTestScenario[] => [
  {
    comment: '000 mitata',
    expectedSessionStatus: '',
    mitigationServiceResponse: {
      match: '0',
      mitigate: '0',
      captcha: '0',
      mitataExpiry: '86400',
      status: 200
    },
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
    mitigationServiceResponse: {
      match: '0',
      mitigate: '0',
      captcha: '0',
      mitataExpiry: '86400',
      status: 200
    },
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
    comment: '110 mitata',
    expectedSessionStatus: 'ua_blocked',
    mitigationServiceResponse: {
      match: '1',
      mitigate: '1',
      captcha: '0',
      mitataExpiry: '86400',
      status: 200
    },
    clientRequest: requests.default,
    originResponse: undefined,
    expectedClientResponse: {
      status: statusCodes.blocked,
      body: 'Forbidden',
      headers: {
        'set-cookie': ['_mitata=testing; Max-Age=86400; Path=/']
      }
    }
  },
  {
    comment: '210 mitata',
    expectedSessionStatus: 'ip_blocked',
    mitigationServiceResponse: {
      match: '2',
      mitigate: '1',
      captcha: '0',
      mitataExpiry: '86400',
      status: 200
    },
    clientRequest: requests.default,
    originResponse: undefined,
    expectedClientResponse: {
      status: statusCodes.blocked,
      body: 'Forbidden',
      headers: {
        'set-cookie': ['_mitata=testing; Max-Age=86400; Path=/']
      }
    }
  },
  {
    comment: '211 mitata',
    expectedSessionStatus: 'ip_blocked,captcha_serve',
    mitigationServiceResponse: {
      match: '2',
      mitigate: '1',
      captcha: '1',
      mitataExpiry: '86400',
      status: 200,
      body: 'fakecaptchapage'
    },
    clientRequest: requests.default,
    originResponse: undefined,
    expectedClientResponse: {
      status: statusCodes.captcha,
      body: 'fakecaptchapage',
      headers: {
        'set-cookie': ['_mitata=testing; Max-Age=86400; Path=/']
      }
    }
  },
  {
    comment: '211 mitata - with captcha keys',
    expectedSessionStatus: 'ip_blocked,captcha_serve',
    workerArgs: {
      captchaSiteKey: 'some-captcha-site-key',
      captchaSecretKey: 'some-captcha-secret-key'
    },
    mitigationServiceResponse: {
      match: '2',
      mitigate: '1',
      captcha: '1',
      mitataExpiry: '86400',
      status: 200,
      body: 'fakecaptchapage'
    },
    clientRequest: requests.default,
    originResponse: undefined,
    expectedClientResponse: {
      status: statusCodes.captcha,
      body: 'fakecaptchapage',
      headers: {
        'set-cookie': ['_mitata=testing; Max-Age=86400; Path=/']
      }
    }
  },
  {
    comment: '212 mitata',
    expectedSessionStatus: 'ip_blocked,captcha_cookiepass',
    mitigationServiceResponse: {
      match: '2',
      mitigate: '1',
      captcha: '2',
      mitataExpiry: '86400',
      status: 200
    },
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
  // {
  //   // disabled until captcha is implemented for the Akamai worker.
  //   comment: '212 mitata captcha POST',
  //   mitigationServiceResponse: {
  //     match: '2',
  //     mitigate: '1',
  //     captcha: '2',
  //     mitataExpiry: '86400',
  //     mitata: 'testing',
  //     status: 200
  //   },
  //   clientRequest: requests.captchaPost,
  //   originResponse: undefined,
  //   expectedClientResponse: {
  //     status: statusCodes.blocked,
  //     body: 'Forbidden',
  //     headers: {
  //       'set-cookie': ['_mitata=testing; Max-Age=86400; Path=/']
  //     },
  //     // sessionStatus: 'ip_blocked,captcha_pass'
  //   },
  //   xhrCallCount: 1
  // },
  {
    comment: '999 mitata',
    expectedSessionStatus: 'unknown_unknown,unknown',
    mitigationServiceResponse: {
      match: '9',
      mitigate: '9',
      captcha: '9',
      mitataExpiry: '86400',
      status: 200
    },
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
    comment: 'Valid Mitata cookie',
    expectedSessionStatus: '',
    clientRequest: requests.defaultWithValidCookie,
    originResponse: defaultOriginResponse,
    expectedClientResponse: {
      status: defaultOriginResponse.status,
      body: defaultOriginResponse.body,
      headers: {}
    }
  },
  {
    comment: 'Valid Mitata cookie - can filter from other client request / origin response cookies',
    expectedSessionStatus: '',
    mitigationServiceResponse: undefined,
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
          '_origin-session=session_token',
          '_origin-tracker=tracking_token'
        ]
      }
    }
  },
  {
    comment: 'Blocked Mitata Cookie',
    expectedSessionStatus: 'ip_blocked',
    clientRequest: requests.defaultWithBlockedCookie,
    originResponse: undefined,
    mitigationServiceResponse: {
      match: '2',
      mitigate: '1',
      captcha: '0',
      mitataExpiry: '86400',
      status: 200
    },
    expectedClientResponse: {
      status: statusCodes.blocked,
      body: 'Forbidden',
      headers: {
        'set-cookie': ['_mitata=testing; Max-Age=86400; Path=/']
      }
    }
  },
  // {
  //   // Disabled until this is implemented for the Akamai worker.
  //   comment: 'EventID is passed',
  //   clientRequest: requests.defaultWithBlockedCookie,
  //   originResponse: undefined,
  //   mitigationServiceResponse: {
  //     match: '2',
  //     mitigate: '1',
  //     captcha: '0',
  //     mitata: 'testing',
  //     mitataExpiry: '86400',
  //     eventId: 'eventid-from-test',
  //     status: 200
  //   },
  //   expectedClientResponse: {
  //     status: statusCodes.blocked,
  //     body: 'Forbidden',
  //     headers: {
  //       'set-cookie': ['_mitata=testing; Max-Age=86400; Path=/']
  //     }
  //     // sessionStatus: 'ip_blocked',
  //   },
  //   xhrCallCount: 1
  // }
  {
    comment: 'Fail-open: Mitigation Service call error',
    expectedSessionStatus: '',
    mitigationServiceResponse: new Error('Testing -> failed Mit Svc call'),
    clientRequest: requests.default,
    originResponse: defaultOriginResponse,
    expectedClientResponse: {
      status: defaultOriginResponse.status,
      body: defaultOriginResponse.body,
      headers: {}
    }
  },
  {
    comment: 'Ingest Service call error',
    expectedSessionStatus: 'ua_blocked',
    mitigationServiceResponse: {
      match: '1',
      mitigate: '1',
      captcha: '0',
      mitataExpiry: '86400',
      status: 200
    },
    ingestResponse: new Error('Testing -> failed Ingest Svc call'),
    clientRequest: requests.default,
    originResponse: undefined,
    expectedClientResponse: {
      status: statusCodes.blocked,
      body: 'Forbidden',
      headers: {
        'set-cookie': ['_mitata=testing; Max-Age=86400; Path=/']
      }
    }
  }
]
